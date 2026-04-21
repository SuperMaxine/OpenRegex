import json
from typing import List, Dict, Optional


def build_optimize_prompt(
    engine_context: str,
    text: str,
    current_regex: str,
    current_flags: List[str],
    error_feedback: str
) -> str:
    return f"""
You are an expert Regex optimizer.
Your task is to optimize the following Regular Expression for the '{engine_context}' engine.
Make it more efficient, robust, or idiomatic without changing its core matching behavior against this subject text:

Subject Text:
{text}

Current Regex:
{current_regex}

Current Flags:
{current_flags}

{error_feedback}

Return ONLY a JSON object with this exact structure, no markdown formatting outside the JSON.
Only use flags supported by the engine:
{{
  "optimized_regex": "the raw regex string without wrappers",
  "flags": ["list", "of", "flags"],
  "explanation": "short explanation of what you improved"
}}
"""


def build_intent_analysis_messages(
    engine_context: str,
    text: str,
    flags: List[str],
    history: List[Dict],
    current_regex: Optional[str],
    regex_context_mode: str
) -> List[Dict]:
    current_regex_block = current_regex if current_regex else "None"

    system_msg = {
        "role": "system",
        "content": f"""
You are an expert Regex assistant.
Your only task is to analyze the user's intent before regex generation.

Engine context:
{engine_context}

Subject Text:
{text}

Current Flags:
{flags}

Current regex currently present in the editor:
{current_regex_block}

Regex context mode:
{regex_context_mode}

Rules:
- If regex_context_mode is "ignore", intent must be "create_new" and use_current_regex must be false.
- If regex_context_mode is "modify", intent must be "modify_existing" and use_current_regex must be true.
- If regex_context_mode is "reference", decide whether the current regex is useful context, but do not force behavior preservation.
- If regex_context_mode is "auto", infer the user's intent from the latest user message and chat history.
- Use "create_new" when the user asks to create, write, generate, or build a new regex.
- Use "modify_existing" when the user asks to fix, improve, optimize, simplify, extend, adapt, or change the current regex/pattern.
- Use "explain_existing" when the user asks what the current regex/pattern does.
- Do not use the existing regex just because it exists.
- Only use the existing regex when the user clearly refers to it or the mode requires it.

Return ONLY a JSON object:
{{
  "intent": "create_new | modify_existing | explain_existing",
  "use_current_regex": true,
  "preserve_existing_behavior": false,
  "reason": "short reason"
}}
"""
    }

    return [system_msg, *history]


def build_generate_messages(
    engine_context: str,
    text: str,
    flags: List[str],
    history: List[Dict],
    error_feedback: str,
    intent: str,
    use_current_regex: bool,
    preserve_existing_behavior: bool,
    current_regex: Optional[str],
    intent_reason: str
) -> List[Dict]:
    current_regex_block = current_regex if current_regex else "None"

    system_msg = {
        "role": "system",
        "content": f"""
You are an expert Regex writer.
Generate a Regular Expression for the '{engine_context}' engine.

Subject Text:
{text}

Current Flags applied by user:
{flags}

Intent analysis result:
- intent: {intent}
- use_current_regex: {use_current_regex}
- preserve_existing_behavior: {preserve_existing_behavior}
- reason: {intent_reason}

Current regex currently present in the editor:
{current_regex_block}

Generation rules:
- If intent is "create_new", create a new regex from the user's request.
- If use_current_regex is false, ignore the current regex completely.
- If intent is "modify_existing", modify the current regex.
- If preserve_existing_behavior is true, preserve the current regex behavior unless the user explicitly asked to change it.
- If intent is "explain_existing", return the current regex as generated_regex and explain what it does.
- Only use flags supported by the engine.
- Return a raw regex string without wrappers.

Return ONLY a JSON object with this exact structure, no markdown formatting outside the JSON:
{{
  "intent": "{intent}",
  "generated_regex": "the raw regex string without wrappers",
  "flags": ["i", "m"],
  "explanation": "short explanation of how it works"
}}
"""
    }

    messages = [system_msg]
    messages.extend(history)

    if error_feedback:
        messages.append({"role": "user", "content": error_feedback})

    return messages