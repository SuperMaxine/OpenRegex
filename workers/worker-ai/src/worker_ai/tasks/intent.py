from worker_ai.ai import LLMClient
from worker_ai.prompts import build_intent_analysis_messages
from worker_ai.tasks.utils import _extract_json_response, VALID_INTENTS


def _analyze_generate_intent(
    client: LLMClient,
    engine_context: str,
    text: str,
    flags: list[str],
    history: list[dict],
    current_regex: str | None,
    regex_context_mode: str,
) -> dict:
    messages = build_intent_analysis_messages(
        engine_context=engine_context,
        text=text,
        flags=flags,
        history=history,
        current_regex=current_regex,
        regex_context_mode=regex_context_mode,
    )

    response = client.chat(messages=messages)
    parsed = _extract_json_response(response.content)

    intent = parsed.get("intent", "create_new")
    if intent not in VALID_INTENTS:
        intent = "create_new"

    use_current_regex = bool(parsed.get("use_current_regex", False))
    preserve_existing_behavior = bool(parsed.get("preserve_existing_behavior", False))
    reason = parsed.get("reason", "")

    if regex_context_mode == "ignore":
        intent = "create_new"
        use_current_regex = False
        preserve_existing_behavior = False

    if regex_context_mode == "modify":
        intent = "modify_existing"
        use_current_regex = True
        preserve_existing_behavior = True

    if not current_regex:
        use_current_regex = False
        preserve_existing_behavior = False
        if intent in {"modify_existing", "explain_existing"}:
            intent = "create_new"

    return {
        "intent": intent,
        "use_current_regex": use_current_regex,
        "preserve_existing_behavior": preserve_existing_behavior,
        "reason": reason,
    }