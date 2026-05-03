from openregex_libs.models import LLMOptimizeRequest
from worker_ai.ai import LLMClient
from worker_ai.broker import RedisBroker
from worker_ai.prompts import build_optimize_prompt
from worker_ai.tasks.utils import _extract_json_response, _compare_match_results


def handle_optimize(client: LLMClient, broker: RedisBroker, task_dict: dict) -> None:
    task_id = task_dict.get("task_id")
    req = LLMOptimizeRequest.model_validate(task_dict)
    text = broker.resolve_text_payload(task_dict)
    engine_context = broker.get_engine_context(req.engine_id)

    current_regex = req.regex
    current_flags = req.flags
    error_feedback = ""

    last_candidate_regex = ""
    last_candidate_flags = []
    last_error = ""

    broker.emit(
        task_id,
        "status",
        {
            "message": "Analyzing original regex & establishing baseline...",
            "step": "init",
            "attempt": 1,
        },
    )

    original_test = broker.test_regex_against_engine(
        req.engine_id,
        current_regex,
        text,
        current_flags,
    )

    original_matches = (
        original_test.matches
        if original_test.success
        and hasattr(original_test, "matches")
        and original_test.matches
        else []
    )
    original_match_count = len(original_matches)

    for attempt in range(1, 4):
        if not broker.is_client_connected(task_id):
            return

        broker.emit(
            task_id,
            "status",
            {
                "message": f"Generating optimization (Attempt {attempt}/3)...",
                "step": "generation",
                "attempt": attempt,
            },
        )

        prompt = build_optimize_prompt(
            engine_context,
            text,
            current_regex,
            current_flags,
            error_feedback,
        )

        raw_content = ""

        try:
            response = client.chat(messages=[{"role": "user", "content": prompt}])
            raw_content = response.content
            parsed = _extract_json_response(raw_content)

            candidate_regex = parsed.get("optimized_regex", "")
            candidate_flags = parsed.get("flags", [])
            explanation = parsed.get("explanation", "")

            last_candidate_regex = candidate_regex
            last_candidate_flags = candidate_flags

            broker.emit(
                task_id,
                "status",
                {
                    "message": f"Validating candidate against '{req.engine_id}' engine...",
                    "step": "validation",
                    "attempt": attempt,
                },
            )

            test_result = broker.test_regex_against_engine(
                req.engine_id,
                candidate_regex,
                text,
                candidate_flags,
            )

            if test_result.success:
                candidate_matches = (
                    test_result.matches
                    if hasattr(test_result, "matches") and test_result.matches
                    else []
                )
                candidate_match_count = len(candidate_matches)

                if original_match_count > 0 and candidate_match_count == 0:
                    test_result.success = False
                    test_result.error = (
                        "Regex syntax is valid, but matches dropped to 0 "
                        f"(expected {original_match_count})."
                    )
                elif not _compare_match_results(original_matches, candidate_matches):
                    explanation += (
                        "\n\n**Warning: Behavior change detected.** "
                        "The optimized regex match results (positions, content, or groups) "
                        "differ from the original. Please review the changes carefully."
                    )

            if test_result.success:
                broker.emit(
                    task_id,
                    "result",
                    {
                        "success": True,
                        "optimized_regex": candidate_regex,
                        "flags": candidate_flags,
                        "explanation": explanation,
                        "attempt": attempt,
                    },
                )
                return

            last_error = test_result.error
            error_feedback = (
                f"Your previous suggestion '{candidate_regex}' with flags "
                f"{candidate_flags} failed with error: {test_result.error}.\n"
                "Fix the error and try again."
            )

            current_regex = candidate_regex
            current_flags = candidate_flags

            broker.emit(
                task_id,
                "status",
                {
                    "message": f"Validation failed: {test_result.error}. Self-correcting...",
                    "step": "error",
                    "attempt": attempt,
                    "details": test_result.error,
                    "regex": candidate_regex,
                    "flags": candidate_flags,
                    "explanation": explanation,
                    "raw": raw_content,
                },
            )

        except Exception as e:
            last_error = str(e)
            error_feedback = f"Failed to parse JSON or test: {str(e)}"

            broker.emit(
                task_id,
                "status",
                {
                    "message": f"Execution error: {str(e)}. Retrying...",
                    "step": "error",
                    "attempt": attempt,
                    "details": str(e),
                    "regex": last_candidate_regex,
                    "flags": last_candidate_flags,
                    "raw": raw_content,
                },
            )

    broker.emit(
        task_id,
        "result",
        {
            "success": False,
            "error": "Failed to optimize the regex after 3 attempts.",
            "optimized_regex": last_candidate_regex,
            "flags": last_candidate_flags,
            "details": last_error,
            "attempt": 3,
        },
    )