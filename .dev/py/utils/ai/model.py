from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List, Union


class Models(str, Enum):
    GPT_5_4 = "gpt-5.4"
    GPT_5_3 = "gpt-5.3"
    GPT_4_5 = "gpt-4.5"
    O3 = "o3"
    O1 = "o1"
    CLAUDE_4_6_OPUS = "claude-4-6-opus-latest"
    CLAUDE_4_6_SONNET = "claude-4-6-sonnet-latest"
    CLAUDE_4_5_SONNET = "claude-4-5-sonnet-latest"
    GEMINI_3_1_PRO = "gemini-3.1-pro"
    GEMINI_2_5_PRO = "gemini-2.5-pro"
    GEMINI_2_5_FLASH = "gemini-2.5-flash"
    GROK_4_20 = "grok-4.20"
    LLAMA_4_SCOUT = "llama-4-scout"
    DEEPSEEK_R1 = "deepseek-r1"
    DEEPSEEK_V3 = "deepseek-v3"
    DEEPSEEK_CHAT = "deepseek-chat"
    DEEPSEEK_REASONER = "deepseek-reasoner"
    GLM_5_1 = "glm-5.1"
    QWEN_3_5 = "qwen-3.5"
    KIMI_K2_5 = "kimi-k2.5"
    OLLAMA = "ollama"
    LOCAL = "local"


@dataclass
class Usage:
    prompt: int = 0
    completion: int = 0
    reasoning: int = 0
    total: int = 0

    def __getitem__(self, key: str) -> Any:
        try:
            return getattr(self, key)
        except AttributeError:
            raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LLMConfig:
    model_name: Union[str, Models]
    api_key: str
    api_base: str
    timeout: int = 60
    max_llm_retries: int = 3
    verify_ssl: bool = True
    log_level: str = "INFO"


@dataclass
class LLMResponse:
    content: str = ""
    thinking: str = ""
    usage: Optional[Usage] = None
    finish_reason: Optional[str] = None
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    raw: Optional[str] = None

    def __getitem__(self, key: str) -> Any:
        try:
            return getattr(self, key)
        except AttributeError:
            raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)