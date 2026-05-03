import json

VALID_CONTEXT_MODES = {"auto", "ignore", "reference", "modify"}
VALID_INTENTS = {"create_new", "modify_existing", "explain_existing"}


def _extract_json_response(content: str) -> dict:
    content = content.strip()

    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    start_idx = content.find("{")
    end_idx = content.rfind("}")

    if start_idx != -1 and end_idx != -1:
        content = content[start_idx:end_idx + 1]

    return json.loads(content)


def _parse_history(description: str) -> list[dict]:
    try:
        parsed_desc = json.loads(description)

        if isinstance(parsed_desc, list):
            return parsed_desc

        return [{"role": "user", "content": description}]
    except Exception:
        return [{"role": "user", "content": description}]


def _normalize_regex_context_mode(value: str | None) -> str:
    if value in VALID_CONTEXT_MODES:
        return value

    return "auto"


def _compare_match_results(original_matches: list, candidate_matches: list) -> bool:
    if len(original_matches) != len(candidate_matches):
        return False
    for orig, cand in zip(original_matches, candidate_matches):
        if orig.start != cand.start or orig.end != cand.end or orig.full_match != cand.full_match:
            return False
        if len(orig.groups) != len(cand.groups):
            return False
        for og, cg in zip(orig.groups, cand.groups):
            if og.start != cg.start or og.end != cg.end or og.content != cg.content or og.name != cg.name:
                return False
    return True