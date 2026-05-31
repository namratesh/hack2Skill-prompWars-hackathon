import httpx
import json
import os
import re
from typing import AsyncGenerator

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

# Verified free-tier models on OpenRouter (as of 2025)
MODELS = {
    "planning": "deepseek/deepseek-chat-v3-0324:free",
    "fast": "meta-llama/llama-3.3-70b-instruct:free",
    "cheap": "meta-llama/llama-3.1-8b-instruct:free",
}

# Ordered fallback chain — all verified free models
FALLBACK_CHAIN = [
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
]


def _get_headers() -> dict:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://travel-engine.onrender.com",
        "X-Title": "Travel Planning Experience Engine",
    }


def _extract_json(text: str) -> str:
    """Strip markdown code fences if the model wraps JSON in them."""
    text = text.strip()
    # Try to extract from ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        return match.group(1).strip()
    # If it starts with { or [ assume it's already JSON
    if text.startswith(("{", "[")):
        return text
    # Last resort: find first { to end
    idx = text.find("{")
    if idx != -1:
        return text[idx:]
    return text


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    model_key: str = "planning",
    max_tokens: int = 4000,
    json_mode: bool = True,
) -> str:
    preferred = MODELS.get(model_key, MODELS["planning"])
    chain = [preferred] + [m for m in FALLBACK_CHAIN if m != preferred]

    last_error: Exception | None = None
    for model in chain:
        try:
            payload: dict = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.7,
            }
            # json_object mode is only reliable on a subset of models;
            # include it and fall back to next model if rejected.
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{OPENROUTER_BASE}/chat/completions",
                    headers=_get_headers(),
                    json=payload,
                )

            if response.status_code in (400, 422) and json_mode:
                # Model may not support json_object — retry without it
                payload.pop("response_format", None)
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{OPENROUTER_BASE}/chat/completions",
                        headers=_get_headers(),
                        json=payload,
                    )

            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return _extract_json(content) if json_mode else content

        except Exception as exc:
            last_error = exc
            continue

    raise RuntimeError(f"All models failed. Last error: {last_error}")


async def stream_llm(
    system_prompt: str,
    user_prompt: str,
    model_key: str = "fast",
    max_tokens: int = 4000,
) -> AsyncGenerator[str, None]:
    preferred = MODELS.get(model_key, MODELS["fast"])
    chain = [preferred] + [m for m in FALLBACK_CHAIN if m != preferred]

    last_error: Exception | None = None
    for model in chain:
        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.7,
                "stream": True,
            }

            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    f"{OPENROUTER_BASE}/chat/completions",
                    headers=_get_headers(),
                    json=payload,
                ) as response:
                    if response.status_code >= 400:
                        last_error = Exception(f"HTTP {response.status_code}")
                        continue
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            chunk = line[6:]
                            if chunk.strip() == "[DONE]":
                                return
                            try:
                                data = json.loads(chunk)
                                delta = data["choices"][0]["delta"].get("content", "")
                                if delta:
                                    yield delta
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue
                    return  # success — stop trying fallbacks

        except Exception as exc:
            last_error = exc
            continue

    raise RuntimeError(f"All streaming models failed. Last error: {last_error}")
