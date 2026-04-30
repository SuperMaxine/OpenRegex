import os
import time
import re
import regex as py_regex
import multiprocessing
import queue
import redis
import json
import functools
import sys
from concurrent.futures import ThreadPoolExecutor
from openregex_libs.models import MatchRequest, MatchResult, MatchGroup, MatchItem

TIMEOUT_MS = int(os.environ.get("WORKER_EXECUTION_TIMEOUT_MS", 1000))
MAX_INPUT_SIZE = int(os.environ.get("WORKER_MAX_INPUT_SIZE", 10485760))
MAX_MATCHES = int(os.environ.get("WORKER_MAX_MATCHES", 10000))
MAX_GROUPS = int(os.environ.get("WORKER_MAX_GROUPS", 1000))
MAX_JSON_SIZE = int(os.environ.get("WORKER_MAX_JSON_SIZE", 10485760))

RE_FLAG_MAP = {
    "i": re.IGNORECASE,
    "I": re.IGNORECASE,
    "m": re.MULTILINE,
    "M": re.MULTILINE,
    "s": re.DOTALL,
    "S": re.DOTALL,
    "x": re.VERBOSE,
    "X": re.VERBOSE,
    "a": re.ASCII,
    "A": re.ASCII,
    "L": re.LOCALE,
    "l": re.LOCALE,
    "u": re.UNICODE,
    "U": re.UNICODE,
}

REGEX_FLAG_MAP = {
    "i": py_regex.IGNORECASE,
    "I": py_regex.IGNORECASE,
    "m": py_regex.MULTILINE,
    "M": py_regex.MULTILINE,
    "s": py_regex.DOTALL,
    "S": py_regex.DOTALL,
    "x": py_regex.VERBOSE,
    "X": py_regex.VERBOSE,
    "a": py_regex.ASCII,
    "A": py_regex.ASCII,
    "b": py_regex.BESTMATCH,
    "B": py_regex.BESTMATCH,
    "e": py_regex.ENHANCEMATCH,
    "E": py_regex.ENHANCEMATCH,
    "f": py_regex.FULLCASE,
    "F": py_regex.FULLCASE,
    "L": py_regex.LOCALE,
    "l": py_regex.LOCALE,
    "p": py_regex.POSIX,
    "P": py_regex.POSIX,
    "r": py_regex.REVERSE,
    "R": py_regex.REVERSE,
    "u": py_regex.UNICODE,
    "U": py_regex.UNICODE,
    "V0": py_regex.VERSION0,
    "v0": py_regex.VERSION0,
    "VERSION0": py_regex.VERSION0,
    "version0": py_regex.VERSION0,
    "V1": py_regex.VERSION1,
    "v1": py_regex.VERSION1,
    "VERSION1": py_regex.VERSION1,
    "version1": py_regex.VERSION1,
    "w": py_regex.WORD,
    "W": py_regex.WORD,
}


def _normalize_flag(flag) -> str:
    if isinstance(flag, str):
        return flag.strip()
    return str(flag)


def _build_flags(req: MatchRequest) -> int:
    engine_id = req.engine_id
    raw_flags = [_normalize_flag(flag) for flag in req.flags]

    if engine_id.endswith("_re"):
        flag_map = RE_FLAG_MAP
        engine_name = "re"
    elif engine_id.endswith("_regex"):
        flag_map = REGEX_FLAG_MAP
        engine_name = "regex"
    else:
        raise ValueError(f"Unknown engine target routed to Python worker: {engine_id}")

    flags = 0
    symbolic_flags = set()

    for flag in raw_flags:
        if not flag:
            continue

        if flag in flag_map:
            flags |= flag_map[flag]
            symbolic_flags.add(flag)
            continue

        if flag.isdigit():
            flags |= int(flag)
            continue

        raise ValueError(f"Unsupported flag '{flag}' for Python {engine_name} engine")

    if engine_id.endswith("_regex"):
        version_flags = {
            flag for flag in symbolic_flags
            if flag in {"V0", "v0", "VERSION0", "version0", "V1", "v1", "VERSION1", "version1"}
        }

        has_v0 = any(flag in version_flags for flag in {"V0", "v0", "VERSION0", "version0"})
        has_v1 = any(flag in version_flags for flag in {"V1", "v1", "VERSION1", "version1"})

        if has_v0 and has_v1:
            raise ValueError("Flags 'V0' and 'V1' are mutually exclusive for Python regex engine")

        charset_mode_flags = {
            flag for flag in symbolic_flags
            if flag in {"a", "A", "L", "l", "u", "U"}
        }

        charset_modes = set()
        if any(flag in charset_mode_flags for flag in {"a", "A"}):
            charset_modes.add("ASCII")
        if any(flag in charset_mode_flags for flag in {"L", "l"}):
            charset_modes.add("LOCALE")
        if any(flag in charset_mode_flags for flag in {"u", "U"}):
            charset_modes.add("UNICODE")

        if len(charset_modes) > 1:
            raise ValueError("Flags 'a', 'L', and 'u' are mutually exclusive for Python regex engine")

    if engine_id.endswith("_re"):
        charset_mode_flags = {
            flag for flag in symbolic_flags
            if flag in {"a", "A", "L", "l", "u", "U"}
        }

        charset_modes = set()
        if any(flag in charset_mode_flags for flag in {"a", "A"}):
            charset_modes.add("ASCII")
        if any(flag in charset_mode_flags for flag in {"L", "l"}):
            charset_modes.add("LOCALE")
        if any(flag in charset_mode_flags for flag in {"u", "U"}):
            charset_modes.add("UNICODE")

        if len(charset_modes) > 1:
            raise ValueError("Flags 'a', 'L', and 'u' are mutually exclusive for Python re engine")

    return flags


@functools.lru_cache(maxsize=1000)
def _compile_re(pattern: str, flags: int):
    return re.compile(pattern, flags)


@functools.lru_cache(maxsize=1000)
def _compile_regex(pattern: str, flags: int):
    return py_regex.compile(pattern, flags)


def engine_loop(input_queue: multiprocessing.Queue, output_queue: multiprocessing.Queue):
    while True:
        try:
            req = input_queue.get()
            if req is None:
                break

            start_time = time.time()
            matches = []
            error = None

            try:
                if len(req.text) > MAX_INPUT_SIZE:
                    raise ValueError(f"Input text exceeds maximum allowed size of {MAX_INPUT_SIZE} bytes.")

                flags = _build_flags(req)

                if req.engine_id.endswith("_re"):
                    regex_obj = _compile_re(req.regex, flags)
                    inv_group_dict = {v: k for k, v in regex_obj.groupindex.items()}

                    for match_id, match in enumerate(regex_obj.finditer(req.text)):
                        if match_id >= MAX_MATCHES:
                            raise ValueError(f"Exceeded maximum allowed matches ({MAX_MATCHES}).")

                        groups = []
                        for i in range(1, regex_obj.groups + 1):
                            if len(groups) >= MAX_GROUPS:
                                raise ValueError(f"Exceeded maximum allowed groups per match ({MAX_GROUPS}).")

                            content = match.group(i)
                            if content is not None:
                                groups.append(MatchGroup(
                                    group_id=i,
                                    name=inv_group_dict.get(i),
                                    content=content,
                                    start=match.start(i),
                                    end=match.end(i)
                                ))

                        matches.append(MatchItem(
                            match_id=match_id,
                            full_match=match.group(0),
                            start=match.start(0),
                            end=match.end(0),
                            groups=groups
                        ))

                elif req.engine_id.endswith("_regex"):
                    regex_obj = _compile_regex(req.regex, flags)
                    inv_group_dict = {v: k for k, v in regex_obj.groupindex.items()}

                    for match_id, match in enumerate(regex_obj.finditer(req.text)):
                        if match_id >= MAX_MATCHES:
                            raise ValueError(f"Exceeded maximum allowed matches ({MAX_MATCHES}).")

                        groups = []
                        for i in range(1, regex_obj.groups + 1):
                            if len(groups) >= MAX_GROUPS:
                                raise ValueError(f"Exceeded maximum allowed groups per match ({MAX_GROUPS}).")

                            content = match.group(i)
                            if content is not None:
                                groups.append(MatchGroup(
                                    group_id=i,
                                    name=inv_group_dict.get(i),
                                    content=content,
                                    start=match.start(i),
                                    end=match.end(i)
                                ))

                        matches.append(MatchItem(
                            match_id=match_id,
                            full_match=match.group(0),
                            start=match.start(0),
                            end=match.end(0),
                            groups=groups
                        ))

                else:
                    raise ValueError(f"Unknown engine target routed to Python worker: {req.engine_id}")

            except Exception as e:
                error = str(e)

            exec_time = (time.time() - start_time) * 1000
            result = MatchResult(
                task_id=req.task_id,
                engine_id=req.engine_id,
                success=error is None,
                matches=matches,
                execution_time_ms=exec_time,
                error=error
            )

            result_json = result.model_dump_json()
            if len(result_json.encode('utf-8')) > MAX_JSON_SIZE:
                result = MatchResult(
                    task_id=req.task_id,
                    engine_id=req.engine_id,
                    success=False,
                    matches=[],
                    execution_time_ms=exec_time,
                    error=f"Output JSON exceeds maximum allowed size of {MAX_JSON_SIZE} bytes."
                )
                result_json = result.model_dump_json()

            output_queue.put(result_json)

        except Exception:
            pass


class PersistentWorker:
    def __init__(self):
        self.input_queue = multiprocessing.Queue()
        self.output_queue = multiprocessing.Queue()
        self.process = None
        self._start()

    def _start(self):
        self.process = multiprocessing.Process(
            target=engine_loop,
            args=(self.input_queue, self.output_queue),
            daemon=True
        )
        self.process.start()

    def restart(self):
        if self.process and self.process.is_alive():
            self.process.terminate()
            self.process.join()

        self.input_queue.close()
        self.output_queue.close()
        self.input_queue = multiprocessing.Queue()
        self.output_queue = multiprocessing.Queue()
        self._start()

    def process_request(self, req: MatchRequest) -> str:
        self.input_queue.put(req)
        try:
            return self.output_queue.get(timeout=TIMEOUT_MS / 1000.0)
        except queue.Empty:
            self.restart()
            return MatchResult(
                task_id=req.task_id,
                engine_id=req.engine_id,
                success=False,
                matches=[],
                execution_time_ms=float(TIMEOUT_MS),
                error=f"TIMEOUT: {req.engine_id} execution exceeded {TIMEOUT_MS}ms SLA."
            ).model_dump_json()
        except Exception as e:
            self.restart()
            return MatchResult(
                task_id=req.task_id,
                engine_id=req.engine_id,
                success=False,
                matches=[],
                execution_time_ms=0.0,
                error=f"WORKER CRASH: Process exited unexpectedly ({str(e)})."
            ).model_dump_json()


class WorkerPool:
    def __init__(self, size: int):
        self.workers = [PersistentWorker() for _ in range(size)]
        self.available = queue.Queue()
        for w in self.workers:
            self.available.put(w)

    def acquire(self) -> PersistentWorker:
        return self.available.get()

    def release(self, worker: PersistentWorker):
        self.available.put(worker)


def resolve_payload(redis_client: redis.Redis, task_dict: dict) -> MatchRequest:
    payload_id = task_dict.get("text_payload_id")
    if payload_id:
        raw_text = redis_client.get(payload_id)
        if not raw_text:
            raise ValueError("Payload expired or missing from Redis")
        task_dict["text"] = raw_text.decode("utf-8") if isinstance(raw_text, bytes) else raw_text
    return MatchRequest.model_validate(task_dict)


def handle_dlq(redis_client: redis.Redis, task_dict: dict, error_msg: str):
    task_dict["attempt_count"] = task_dict.get("attempt_count", 0) + 1
    task_dict["error_reason"] = error_msg
    try:
        redis_client.lpush("queue:python:dead", json.dumps(task_dict))
    except Exception:
        pass


def publish_result(redis_client: redis.Redis, task_id: str, result_json: str):
    try:
        with redis_client.pipeline() as pipe:
            pipe.setex(f"result:{task_id}", 60, result_json)
            pipe.publish(f"result:{task_id}", "ready")
            pipe.execute()
    except Exception as e:
        print(f"[Error] Failed to publish result to Redis pipeline: {e}", flush=True)


def process_task(redis_client: redis.Redis, raw_json: str, pool: WorkerPool):
    task_dict = {}
    try:
        task_dict = json.loads(raw_json)
        req = resolve_payload(redis_client, task_dict)

        worker = pool.acquire()
        try:
            result_json = worker.process_request(req)
            publish_result(redis_client, req.task_id, result_json)
        finally:
            pool.release(worker)

    except Exception as e:
        error_msg = str(e)
        print(f"[Error] Task processing failure: {error_msg}", flush=True)
        handle_dlq(redis_client, task_dict, error_msg)

        task_id = task_dict.get("task_id", "unknown")
        if task_id != "unknown":
            error_res = MatchResult(
                task_id=task_id,
                engine_id=task_dict.get("engine_id", "unknown"),
                success=False,
                matches=[],
                execution_time_ms=0.0,
                error=error_msg
            )
            publish_result(redis_client, task_id, error_res.model_dump_json())


def listen_and_process(redis_client: redis.Redis):
    print("[Worker] Python worker listening on 'queue:python'...", flush=True)

    num_cores = multiprocessing.cpu_count()
    pool = WorkerPool(size=max(1, num_cores))

    dispatch_threads = ThreadPoolExecutor(max_workers=max(2, num_cores * 2))

    while True:
        try:
            _, task_json_bytes = redis_client.brpop("queue:python")
            dispatch_threads.submit(process_task, redis_client, task_json_bytes, pool)
        except Exception as e:
            print(f"[Error] Global loop failure: {e}", flush=True)
            time.sleep(1)