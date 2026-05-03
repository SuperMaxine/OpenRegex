# OpenRegex Worker Node Architecture

This document defines the architecture and implementation contract for OpenRegex worker nodes.

It focuses on **regex execution workers** that consume Redis queue tasks, execute regex engines, and return structured match results.

> **Important note:** The AI workflow is an independent implementation. AI workers may use OpenRegex workers for validation, but they are not part of the core regex worker execution contract described here.

---

## 1. Scope

This document applies to regex execution workers, including but not limited to:

- Python workers
- Rust workers
- Go workers
- .NET workers
- JVM workers
- PHP workers
- V8 workers
- C/C++ workers

The document does **not** define the internal architecture of the AI worker.

The AI worker has its own queues, status events, LLM workflow, retry logic, and result channels. It may call regex workers through the same Redis contract when it needs to validate generated or optimized regex patterns.

---

## 2. Core Responsibilities

A compliant OpenRegex regex worker must provide the following guarantees.

### 2.1 Persistent Execution

Workers must avoid cold-starting a regex engine for every request.

Execution engines should stay hot in memory whenever possible.

Examples:

- Long-running worker process
- Persistent subprocess engine pool
- Thread pool
- Runtime-specific persistent execution context

### 2.2 Redis Queue Consumption

Workers consume tasks from Redis queues using blocking pop semantics.

The canonical queue format is:

```text
queue:<worker-family>
```

Examples:

```text
queue:python
queue:rust
queue:go
queue:dotnet
queue:jvm
queue:php
queue:v8
queue:c-cpp
```

Some workers may support queue aliases for compatibility, for example:

```text
queue:c_cpp
queue:cpp
queue:c
```

### 2.3 Decoupled Queue Polling and Execution

Queue polling must not be blocked by regex execution.

After a task is popped from Redis, the worker should dispatch it to one of the following:

- async task
- thread pool
- worker process
- subprocess engine pool

This allows the worker to keep accepting new work while existing tasks are executing.

### 2.4 Bounded Execution

Regex execution must be protected by a hard execution limit.

The default SLA is:

```text
1000ms
```

If execution exceeds the SLA, the worker must stop the execution safely and return a timeout error.

Unsafe engines must be isolated strongly enough that a hung regex cannot block the whole worker permanently.

Recommended strategies:

- kill and restart a subprocess
- use a disposable worker process
- use engine-level timeout support
- use cancellation-aware execution wrappers

### 2.5 Claim-Check Payload Resolution

Workers must support the Claim-Check pattern for large text payloads.

If a request contains `text_payload_id`, the worker must fetch the actual subject text from Redis before execution.

If the payload key is missing or expired, the worker must return an error result.

Expected error:

```text
Payload expired or missing from Redis
```

### 2.6 Structured Result Reporting

Workers must publish completion notifications to the task-specific result channel.

The result channel format is:

```text
result:<task_id>
```

The current implementation may use either of these compatible result delivery styles:

1. Publish the full result JSON directly to `result:<task_id>`.
2. Store the result JSON under `result:<task_id>` with TTL, then publish `ready` to `result:<task_id>`.

Consumers must support the current implementation pattern:

```text
SETEX result:<task_id> <ttl> <result-json>
PUBLISH result:<task_id> ready
```

---

## 3. Worker Registration and Discovery

Workers should register their availability and supported engines in Redis.

The worker registry key is:

```text
openregex:workers
```

The registry allows other services to discover:

- worker name
- supported engine IDs
- engine labels
- engine versions
- engine capabilities
- engine documentation metadata

This registry is especially useful for routing validation requests to the correct worker queue.

---

## 4. Data Contracts

Workers communicate using JSON over Redis.

---

## 4.1 Inbound Task: `MatchRequest`

A task is pushed to the relevant worker queue.

Example queue:

```text
queue:python
```

Example request:

```json
{
  "task_id": "uuid-string",
  "engine_id": "engine_specific_identifier",
  "regex": "^(?i)pattern$",
  "text": "subject text if small",
  "flags": ["i", "m"],
  "text_payload_id": "payload:uuid-string"
}
```

### Field descriptions

| Field | Required | Description |
|---|---:|---|
| `task_id` | yes | Unique task identifier. |
| `engine_id` | yes | Target regex engine identifier. |
| `regex` | yes | Regex pattern to execute. |
| `text` | yes | Subject text, unless claim-check payload is used. |
| `flags` | yes | Generic OpenRegex flags. |
| `text_payload_id` | no | Redis key containing large subject text. |

---

## 4.2 Outbound Task: `MatchResult`

The result is returned through the task result channel.

Channel:

```text
result:<task_id>
```

Example result:

```json
{
  "task_id": "uuid-string",
  "engine_id": "engine_specific_identifier",
  "success": true,
  "matches": [
    {
      "match_id": 0,
      "full_match": "pattern",
      "start": 0,
      "end": 7,
      "groups": [
        {
          "group_id": 1,
          "name": "optional_name",
          "content": "pattern",
          "start": 0,
          "end": 7
        }
      ]
    }
  ],
  "execution_time_ms": 12.5,
  "error": null
}
```

### Failure result example

```json
{
  "task_id": "uuid-string",
  "engine_id": "engine_specific_identifier",
  "success": false,
  "matches": [],
  "execution_time_ms": 1000,
  "error": "TIMEOUT: Engine execution exceeded 1000ms SLA."
}
```

---

## 5. Generic Flag Mapping

Workers must map OpenRegex generic flags to the target engine's native options.

| OpenRegex Flag | Meaning |
|---|---|
| `i` | Case-insensitive matching |
| `m` | Multiline mode |
| `s` | Dot matches newline / singleline mode |
| `x` | Extended / verbose mode |

Unsupported flags should either be ignored safely or reported as validation errors, depending on the engine contract.

---

## 6. Match and Group Mapping

Workers must return all matches found by the engine.

Each match must include:

- `match_id`
- `full_match`
- `start`
- `end`
- `groups`

Each captured group must include:

- `group_id`
- `name`
- `content`
- `start`
- `end`

Group numbering starts at `1`.

The full match is group `0`, but it is represented at the match level rather than inside the `groups` array.

---

## 7. Guardrails

Workers should enforce safety and resource guardrails.

Required guardrail:

```text
1000ms regex execution timeout
```

Recommended guardrails:

- maximum input size
- maximum number of matches
- maximum number of groups
- subprocess restart after crash
- subprocess restart after timeout
- bounded worker pool size
- Redis result TTL

These limits prevent a single request from exhausting worker resources.

---

## 8. Dead-Letter Queues

Workers should send unrecoverable internal failures to a dead-letter queue.

Recommended format:

```text
queue:<worker-family>:dead
```

Examples:

```text
queue:python:dead
queue:rust:dead
queue:c-cpp:dead
queue:ai:dead
```

Dead-letter payloads should include the original task plus diagnostic fields such as:

```json
{
  "attempt_count": 1,
  "error_reason": "Internal worker error"
}
```

Dead-letter queues are for operational visibility and debugging. They are not part of the normal success path.

---

## 9. Reference Worker Flow

```python
def start_worker(redis_client):
    queue_name = "queue:worker-family"

    while True:
        raw_task = redis_client.brpop(queue_name)
        dispatch_to_executor(process_task, redis_client, raw_task)


def process_task(redis_client, raw_task):
    start_time = now_ms()

    try:
        raw_json = parse_json(raw_task)
        request = deserialize_match_request(raw_json)

        payload_id = raw_json.get("text_payload_id")
        if payload_id:
            actual_text = redis_client.get(payload_id)
            if actual_text is None:
                publish_result(redis_client, {
                    "task_id": request.task_id,
                    "engine_id": request.engine_id,
                    "success": False,
                    "matches": [],
                    "execution_time_ms": now_ms() - start_time,
                    "error": "Payload expired or missing from Redis"
                })
                return

            request.text = actual_text

        result = execute_regex_with_timeout(
            engine_id=request.engine_id,
            regex=request.regex,
            text=request.text,
            flags=request.flags,
            timeout_ms=1000,
        )

        response = {
            "task_id": request.task_id,
            "engine_id": request.engine_id,
            "success": True,
            "matches": result.matches,
            "execution_time_ms": now_ms() - start_time,
            "error": None,
        }

    except TimeoutError:
        response = {
            "task_id": request.task_id,
            "engine_id": request.engine_id,
            "success": False,
            "matches": [],
            "execution_time_ms": now_ms() - start_time,
            "error": "TIMEOUT: Engine execution exceeded 1000ms SLA."
        }

    except Exception as exc:
        response = {
            "task_id": getattr(request, "task_id", None),
            "engine_id": getattr(request, "engine_id", None),
            "success": False,
            "matches": [],
            "execution_time_ms": now_ms() - start_time,
            "error": str(exc),
        }

    publish_result(redis_client, response)


def publish_result(redis_client, response):
    task_id = response["task_id"]
    key = f"result:{task_id}"
    channel = f"result:{task_id}"

    redis_client.setex(key, 60, to_json(response))
    redis_client.publish(channel, "ready")
```

---

## 10. AI Worker Independence

The AI workflow is intentionally independent from the regex worker architecture.

AI workers may have their own:

- queues
- request models
- result channels
- status events
- LLM clients
- retry behavior
- prompt handling
- intent analysis
- validation loops

Known AI queue examples:

```text
queue:llm:optimize
queue:llm:generate
```

Known AI result channel pattern:

```text
result:llm:<task_id>
```

The AI worker may call regex workers to validate generated or optimized regexes, but regex workers should not depend on the AI worker.

This separation keeps the regex execution layer deterministic, reusable, and independent from LLM-specific workflow logic.

---
