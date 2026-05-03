from worker_ai.ai import LLMClient
from worker_ai.broker import RedisBroker


def handle_title(client: LLMClient, broker: RedisBroker, task_dict: dict) -> None:
    task_id = task_dict.get("task_id")
    message = task_dict.get("message", "")

    system_prompt = "Generate a 3-5 word title for a regex task based on this message. Return ONLY the title string, no markdown, no quotes."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message}
    ]

    try:
        response = client.chat(
            messages=messages,
            options={"max_tokens": 15},
            enable_thinking=False
        )
        title = response.content.strip().strip('"\'')
        broker.emit(task_id, "result", {"success": True, "title": title})
    except Exception as e:
        broker.emit(task_id, "error", {"success": False, "error": str(e)})