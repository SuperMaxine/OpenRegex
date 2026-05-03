import os
import json
import redis
import time
import threading
import concurrent.futures
from worker_ai.ai import LLMClient
from worker_ai.broker import RedisBroker
from worker_ai.tasks import handle_optimize, handle_generate, handle_title


def process_task(redis_client: redis.Redis, llm_client: LLMClient, broker: RedisBroker, queue_name: str,
                 task_dict: dict):
    task_id = task_dict.get("task_id")
    if not task_id:
        return

    channel_name = f"result:llm:{task_id}"
    subs = redis_client.pubsub_numsub(channel_name)
    if subs and subs[0][1] == 0:
        print(f"[Worker] Task {task_id} aborted by user. Skipping.", flush=True)
        return

    try:
        if queue_name == "queue:llm:optimize":
            handle_optimize(llm_client, broker, task_dict)
        elif queue_name == "queue:llm:generate":
            handle_generate(llm_client, broker, task_dict)
        elif queue_name == "queue:llm:title":
            handle_title(llm_client, broker, task_dict)
    except Exception as e:
        print(f"[Error] Task {task_id} execution failed: {e}", flush=True)
        try:
            task_dict["attempt_count"] = task_dict.get("attempt_count", 0) + 1
            task_dict["error_reason"] = str(e)
            redis_client.lpush("queue:ai:dead", json.dumps(task_dict))
            broker.emit(task_id, "error", {"success": False, "error": f"Internal AI Worker error: {e}"})
        except Exception:
            pass


def listen_and_process(redis_client: redis.Redis, llm_client: LLMClient, version: str, release_date: str):
    max_workers = int(os.environ.get("AI_MAX_WORKERS", 2))
    print(f"[Worker] LLM worker listening on 'queue:llm:optimize', 'queue:llm:generate', and 'queue:llm:title'...", flush=True)
    print(f"[Worker] ThreadPoolExecutor initialized with {max_workers} workers.", flush=True)

    broker = RedisBroker(redis_client)
    broker.start_heartbeat(version, release_date)

    semaphore = threading.Semaphore(max_workers)

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        while True:
            try:
                semaphore.acquire()

                result = redis_client.brpop(["queue:llm:optimize", "queue:llm:generate", "queue:llm:title"], timeout=1)
                if not result:
                    semaphore.release()
                    continue

                queue_name, task_json_bytes = result
                task_dict = json.loads(task_json_bytes)

                def task_wrapper(q_name, t_dict):
                    try:
                        process_task(redis_client, llm_client, broker, q_name, t_dict)
                    finally:
                        semaphore.release()

                executor.submit(task_wrapper, queue_name, task_dict)

            except Exception as e:
                print(f"[Error] LLM Worker Global loop failure: {e}", flush=True)
                semaphore.release()
                time.sleep(1)