import os
import json
import time
import logging
import requests
import urllib3
import re
from typing import List, Dict, Any, Union, Iterator, Optional, Tuple
from requests.adapters import HTTPAdapter
from requests.exceptions import RequestException, HTTPError
from urllib3.util.retry import Retry
from dataclasses import asdict

from .model import LLMConfig, LLMResponse, Usage, Models

logger = logging.getLogger(__name__)

class BaseLLMAdapter:
    def build_url(self, base_url: str) -> str:
        url = base_url.strip().rstrip("/")
        if url.endswith("/chat/completions"):
            return url
        elif url.endswith("/v1"):
            return f"{url}/chat/completions"
        return f"{url}/v1/chat/completions"

    def build_headers(self, api_key: str, base_url: str) -> Dict[str, str]:
        headers = {}
        if "openai.azure.com" in base_url:
            headers["api-key"] = api_key
            if "/deployments/" not in base_url and "/openai" not in base_url:
                logger.warning(f"Azure URL detected but looks incomplete: {base_url}.")
        else:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    def build_payload(self, model_name: str, messages: List[Dict], stream: bool, enable_thinking: bool,
                      options: Optional[Dict], tools: Optional[List[Dict]]) -> Dict:
        payload = {
            "model": model_name,
            "messages": messages,
            "stream": stream,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        if stream:
            payload["stream_options"] = {"include_usage": True}

        opts = options.copy() if options else {}
        if "response_format" in opts:
            payload["response_format"] = opts.pop("response_format")

        payload.update(opts)
        return payload

    def normalize_messages(self, messages: List[Dict]) -> List[Dict]:
        return messages

    def standardize_usage(self, raw_usage: Dict) -> Usage:
        if not raw_usage:
            return Usage()

        prompt = raw_usage.get("prompt_tokens") or raw_usage.get("input_tokens") or 0
        completion = raw_usage.get("completion_tokens") or raw_usage.get("output_tokens") or 0
        total = raw_usage.get("total_tokens") or (prompt + completion)

        reasoning = 0
        details = raw_usage.get("completion_tokens_details", {})
        if isinstance(details, dict):
            reasoning = details.get("reasoning_tokens", 0)

        if not reasoning:
            reasoning = raw_usage.get("thinking_tokens", 0)

        return Usage(
            prompt=prompt,
            completion=completion,
            reasoning=reasoning,
            total=total
        )

    def process_full(self, response: requests.Response) -> LLMResponse:
        try:
            data = response.json()
            return self.normalize_full(data)
        except json.JSONDecodeError:
            logger.error("Failed to decode JSON from full response.")
            return LLMResponse(error="Invalid JSON", raw=response.text)

    def process_stream(self, response: requests.Response) -> Iterator[LLMResponse]:
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8').strip()
                if decoded_line.startswith("data: "):
                    json_str = decoded_line[6:]
                    if json_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(json_str)
                        yield self.normalize_chunk(chunk)
                    except json.JSONDecodeError:
                        continue

    def normalize_full(self, data: Dict) -> LLMResponse:
        output = LLMResponse()
        if "usage" in data:
            output.usage = self.standardize_usage(data["usage"])

        choices = data.get("choices", [])
        if choices:
            choice = choices[0]
            message = choice.get("message", {})
            output.finish_reason = choice.get("finish_reason")

            if message.get("content"):
                output.content = message["content"]

            if message.get("tool_calls"):
                output.tool_calls = message["tool_calls"]

            output.thinking = (
                    message.get("reasoning_content") or
                    message.get("thinking") or
                    message.get("reasoning") or
                    ""
            )
        return output

    def normalize_chunk(self, chunk: Dict) -> LLMResponse:
        output = LLMResponse()
        if "usage" in chunk and chunk["usage"]:
            output.usage = self.standardize_usage(chunk["usage"])

        choices = chunk.get("choices", [])
        if choices:
            choice = choices[0]
            delta = choice.get("delta", {})
            output.finish_reason = choice.get("finish_reason")

            if delta.get("content"):
                output.content = delta["content"]

            output.thinking = (
                    delta.get("reasoning_content") or
                    delta.get("thinking") or
                    delta.get("reasoning") or
                    ""
            )
        return output

class OpenAIAdapter(BaseLLMAdapter):
    def build_payload(self, model_name: str, messages: List[Dict], stream: bool, enable_thinking: bool,
                      options: Optional[Dict], tools: Optional[List[Dict]]) -> Dict:
        payload = super().build_payload(model_name, messages, stream, enable_thinking, options, tools)
        model_lower = model_name.lower()
        opts = options or {}

        if enable_thinking and any(m in model_lower for m in ["o1", "o3", "gpt-5"]):
            payload["reasoning_effort"] = opts.get("reasoning_effort", "medium")
            if "max_tokens" in payload:
                payload["max_completion_tokens"] = payload.pop("max_tokens")

        return payload

class AnthropicAdapter(BaseLLMAdapter):
    def build_payload(self, model_name: str, messages: List[Dict], stream: bool, enable_thinking: bool,
                      options: Optional[Dict], tools: Optional[List[Dict]]) -> Dict:
        payload = super().build_payload(model_name, messages, stream, enable_thinking, options, tools)
        opts = options or {}

        if enable_thinking:
            payload["thinking"] = {
                "type": "enabled",
                "budget_tokens": opts.get("thinking_budget", 2048)
            }
        return payload

class DeepSeekAdapter(BaseLLMAdapter):
    def build_payload(self, model_name: str, messages: List[Dict], stream: bool, enable_thinking: bool,
                      options: Optional[Dict], tools: Optional[List[Dict]]) -> Dict:
        payload = super().build_payload(model_name, messages, stream, enable_thinking, options, tools)
        if enable_thinking:
            payload["include_reasoning"] = True
        return payload

class GeminiAdapter(BaseLLMAdapter):
    def build_payload(self, model_name: str, messages: List[Dict], stream: bool, enable_thinking: bool,
                      options: Optional[Dict], tools: Optional[List[Dict]]) -> Dict:
        payload = super().build_payload(model_name, messages, stream, enable_thinking, options, tools)
        if enable_thinking:
            payload["generationConfig"] = {
                "thinkingConfig": {
                    "includeThoughts": True
                }
            }
        return payload

class GenericProxyAdapter(BaseLLMAdapter):
    def build_payload(self, model_name: str, messages: List[Dict], stream: bool, enable_thinking: bool,
                      options: Optional[Dict], tools: Optional[List[Dict]]) -> Dict:
        payload = super().build_payload(model_name, messages, stream, enable_thinking, options, tools)
        payload.pop("reasoning_effort", None)
        payload.pop("think", None)
        return payload

class AdapterFactory:
    _registry: List[Tuple[List[str], type[BaseLLMAdapter]]] = []

    @classmethod
    def register(cls, keywords: List[str], adapter_cls: type[BaseLLMAdapter]) -> None:
        cls._registry.append((keywords, adapter_cls))

    @classmethod
    def get_adapter(cls, model_name: str) -> BaseLLMAdapter:
        name_lower = model_name.lower()
        for keywords, adapter_cls in cls._registry:
            if any(kw in name_lower for kw in keywords):
                return adapter_cls()
        return BaseLLMAdapter()

# Register Adapters
AdapterFactory.register(["o1", "o3", "gpt"], OpenAIAdapter)
AdapterFactory.register(["claude"], AnthropicAdapter)
AdapterFactory.register(["deepseek"], DeepSeekAdapter)
AdapterFactory.register(["gemini"], GeminiAdapter)
AdapterFactory.register(["ollama", "lms", "local", "gemma"], GenericProxyAdapter)

class LLMClient:
    def __init__(self, config: LLMConfig) -> None:
        self.config = config

        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        logger.setLevel(log_level)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        self.model_name = config.model_name.value if isinstance(config.model_name, Models) else config.model_name
        self.default_timeout = config.timeout
        self.default_max_retries = config.max_llm_retries
        self.verify_ssl = config.verify_ssl

        logger.debug(f"Initializing LLMClient for model: {self.model_name}")

        if not self.verify_ssl:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        self.adapter = AdapterFactory.get_adapter(self.model_name)
        self.api_url = self.adapter.build_url(config.api_base)
        self.auth_headers = self.adapter.build_headers(config.api_key, config.api_base)
        self.session = self._init_session()

    def _init_session(self) -> requests.Session:
        session = requests.Session()
        pool_size = int(os.environ.get("AI_MAX_WORKERS", 2))
        adapter = HTTPAdapter(
            pool_connections=pool_size,
            pool_maxsize=pool_size,
            max_retries=Retry(total=0, backoff_factor=0.1)
        )
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update(self.auth_headers)
        session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "DevAI-Worker/2.0"
        })
        session.verify = self.verify_ssl
        return session

    def _record_usage(self, usage: Dict[str, Any]) -> None:
        if not usage or usage.get("total", 0) == 0:
            return
        logger.info(f"LLM Usage Recorded: {json.dumps(usage)}")

    def _check_fatal_error(self, response: requests.Response) -> None:
        if response.status_code == 429:
            raise RequestException("Rate Limit Exceeded or Tokens Exhausted. Check provider limits.")
        if response.status_code in (401, 403):
            raise RequestException("Unauthorized. Verify your LLM API Key and Endpoint configuration.")

    def chat(
            self,
            messages: List[Dict[str, str]],
            options: Optional[Dict[str, Any]] = None,
            stream: bool = False,
            enable_thinking: bool = True,
            tools: Optional[List[Dict]] = None,
            **kwargs: Any
    ) -> Union[LLMResponse, Iterator[LLMResponse]]:

        timeout = kwargs.get('timeout', self.default_timeout)
        max_retries = kwargs.get('max_retries', self.default_max_retries)

        normalized_messages = self.adapter.normalize_messages(messages)
        payload = self.adapter.build_payload(
            self.model_name, normalized_messages, stream, enable_thinking, options, tools
        )

        for attempt in range(max_retries + 1):
            try:
                response = self.session.post(
                    self.api_url,
                    json=payload,
                    timeout=timeout,
                    stream=stream
                )

                self._check_fatal_error(response)
                response.raise_for_status()

                if stream:
                    def stream_generator():
                        for chunk in self.adapter.process_stream(response):
                            if chunk.usage:
                                self._record_usage(asdict(chunk.usage))
                            yield chunk
                    return stream_generator()
                else:
                    result = self.adapter.process_full(response)
                    if result.usage:
                        self._record_usage(asdict(result.usage))
                    return result

            except (HTTPError, RequestException) as e:
                is_fatal = False
                if isinstance(e, HTTPError) and e.response is not None:
                    code = e.response.status_code
                    if 400 <= code < 500 and code != 429:
                        is_fatal = True

                if "Rate Limit Exceeded" in str(e) or "Unauthorized" in str(e):
                    is_fatal = True

                if attempt < max_retries and not is_fatal:
                    wait_time = min(60, 2 * (2 ** attempt))
                    logger.warning(f"LLM Error (Attempt {attempt + 1}): {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"LLM Critical Failure. URL: {self.api_url} | Error: {e}")
                    safe_error = re.sub(r" for url: https?://\S+", "", str(e))
                    safe_error = re.sub(r"https?://\S+", "<URL_REDACTED>", safe_error)
                    raise Exception(safe_error)

        raise Exception("Unknown LLM Execution Flow Error")

    def close(self):
        self.session.close()

    def __del__(self):
        try:
            self.session.close()
        except Exception:
            pass