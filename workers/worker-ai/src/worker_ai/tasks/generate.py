from openregex_libs.models import LLMGenerateRequest
from worker_ai.ai import LLMClient
from worker_ai.broker import RedisBroker
from worker_ai.prompts import build_generate_messages
from worker_ai.tasks.utils import (
    _extract_json_response,
    _parse_history,
    _normalize_regex_context_mode,
    VALID_INTENTS,
)
from worker_ai.tasks.intent import _analyze_generate_intent


def handle_generate(client: LLMClient, broker: RedisBroker, task_dict: dict) -> None:
    task_id = task_dict.get("task_id")
    req = LLMGenerateRequest.model_validate(task_dict)
    text = broker.resolve_text_payload(task_dict)
    engine_context = broker.get_engine_context(req.engine_id)

    history = _parse_history(req.description)

    current_regex = getattr(req, "current_regex", None) or task_dict.get("current_regex")
    regex_context_mode = _normalize_regex_context_mode(
        getattr(req, "regex_context_mode", None) or task_dict.get("regex_context_mode")
    )

    error_feedback = ""

    last_candidate_regex = ""
    last_candidate_flags = []
    last_error = ""
    last_intent = "create_new"
    last_intent_reason = ""

    broker.emit(
        task_id,
        "status",
        {
            "message": "Reading prompt history...",
            "step": "init",
            "attempt": 1,
        },
    )

    for attempt in range(1, 4):
        if not broker.is_client_connected(task_id):
            return

        intent_result = {
            "intent": last_intent,
            "use_current_regex": False,
            "preserve_existing_behavior": False,
            "reason": last_intent_reason,
        }

        if attempt == 1:
            try:
                broker.emit(
                    task_id,
                    "status",
                    {
                        "message": "Analyzing user intent and current regex context...",
                        "step": "thinking",
                        "attempt": attempt,
                    },
                )

                intent_result = _analyze_generate_intent(
                    client=client,
                    engine_context=engine_context,
                    text=text,
                    flags=req.flags,
                    history=history,
                    current_regex=current_regex,
                    regex_context_mode=regex_context_mode,
                )

                last_intent = intent_result["intent"]
                last_intent_reason = intent_result["reason"]

                broker.emit(
                    task_id,
                    "status",
                    {
                        "message": (
                            f"Intent detected: {intent_result['intent']} "
                            f"(use current regex: {intent_result['use_current_regex']})"
                        ),
                        "step": "generation",
                        "attempt": attempt,
                        "intent": intent_result["intent"],
                    },
                )

            except Exception as e:
                last_error = str(e)
                last_intent = "create_new"
                last_intent_reason = "Intent analysis failed, defaulting to create_new."

                broker.emit(
                    task_id,
                    "status",
                    {
                        "message": "Intent analysis failed. Falling back to new regex generation...",
                        "step": "generation",
                        "attempt": attempt,
                        "details": str(e),
                        "intent": last_intent,
                    },
                )

                intent_result = {
                    "intent": last_intent,
                    "use_current_regex": False,
                    "preserve_existing_behavior": False,
                    "reason": last_intent_reason,
                }
        else:
            broker.emit(
                task_id,
                "status",
                {
                    "message": f"Regenerating Regex (Attempt {attempt}/3)...",
                    "step": "generation",
                    "attempt": attempt,
                    "intent": last_intent,
                },
            )

            intent_result = {
                "intent": last_intent,
                "use_current_regex": bool(current_regex) and last_intent != "create_new",
                "preserve_existing_behavior": last_intent == "modify_existing",
                "reason": last_intent_reason,
            }

        raw_content = ""

        try:
            messages = build_generate_messages(
                engine_context=engine_context,
                text=text,
                flags=req.flags,
                history=history,
                error_feedback=error_feedback,
                intent=intent_result["intent"],
                use_current_regex=intent_result["use_current_regex"],
                preserve_existing_behavior=intent_result["preserve_existing_behavior"],
                current_regex=current_regex,
                intent_reason=intent_result["reason"],
            )

            response = client.chat(messages=messages)
            raw_content = response.content
            parsed = _extract_json_response(raw_content)

            candidate_regex = parsed.get("generated_regex", "")
            candidate_flags = parsed.get("flags", [])
            explanation = parsed.get("explanation", "")
            intent = parsed.get("intent", intent_result["intent"])

            if intent not in VALID_INTENTS:
                intent = intent_result["intent"]

            last_candidate_regex = candidate_regex
            last_candidate_flags = candidate_flags
            last_intent = intent

            broker.emit(
                task_id,
                "status",
                {
                    "message": f"Validating candidate against '{req.engine_id}' engine...",
                    "step": "validation",
                    "attempt": attempt,
                    "intent": intent,
                    "regex": candidate_regex,
                    "flags": candidate_flags,
                    "explanation": explanation,
                    "raw": raw_content,
                },
            )

            test_result = broker.test_regex_against_engine(
                req.engine_id,
                candidate_regex,
                text,
                candidate_flags,
            )

            if test_result.success:
                broker.emit(
                    task_id,
                    "result",
                    {
                        "success": True,
                        "intent": intent,
                        "intent_reason": intent_result["reason"],
                        "use_current_regex": intent_result["use_current_regex"],
                        "preserve_existing_behavior": intent_result["preserve_existing_behavior"],
                        "generated_regex": candidate_regex,
                        "flags": candidate_flags,
                        "explanation": explanation,
                        "attempt": attempt,
                    },
                )
                return

            last_error = test_result.error
            error_feedback = (
                f"Your generated regex '{candidate_regex}' with flags "
                f"{candidate_flags} failed with error: {test_result.error}.\n"
                f"Fix it while keeping the same intent: {intent}."
            )

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
                    "intent": intent,
                    "explanation": explanation,
                    "raw": raw_content,
                },
            )

        except Exception as e:
            last_error = str(e)
            error_feedback = (
                f"Failed to parse or test: {str(e)}\n"
                f"Try again while keeping the same intent: {last_intent}."
            )

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
                    "intent": last_intent,
                    "raw": raw_content,
                },
            )

    broker.emit(
        task_id,
        "result",
        {
            "success": False,
            "error": "Failed to generate a working regex after 3 attempts.",
            "generated_regex": last_candidate_regex,
            "flags": last_candidate_flags,
            "intent": last_intent,
            "intent_reason": last_intent_reason,
            "details": last_error,
            "attempt": 3,
        },
    )