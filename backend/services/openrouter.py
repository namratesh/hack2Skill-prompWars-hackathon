import httpx
import json
import os
from typing import AsyncGenerator

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

MODELS = {
    "planning": "nvidia/nemotron-3-super-120b-a12b:free",
    "fast": "openai/gpt-oss-120b:free",
    "cheap": "openai/gpt-oss-20b:free",
}

FALLBACK_CHAIN = [
    "openai/gpt-oss-120b:free",
    "google/gemini-flash-1.5",
    "meta-llama/llama-3.1-8b-instruct",
]


def _get_headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://travel-engine.vercel.app",
        "X-Title": "Travel Planning Experience Engine",
    }


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    model_key: str = "planning",
    max_tokens: int = 4000,
    json_mode: bool = True,
) -> str:
    model = MODELS.get(model_key, MODELS["planning"])
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    for attempt_model in [model] + [m for m in FALLBACK_CHAIN if m != model]:
        try:
            payload["model"] = attempt_model
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{OPENROUTER_BASE}/chat/completions",
                    headers=_get_headers(),
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            if attempt_model == FALLBACK_CHAIN[-1]:
                raise
            continue
    raise RuntimeError("All models failed")


async def stream_llm(
    system_prompt: str,
    user_prompt: str,
    model_key: str = "fast",
    max_tokens: int = 4000,
) -> AsyncGenerator[str, None]:
    model = MODELS.get(model_key, MODELS["fast"])
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

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{OPENROUTER_BASE}/chat/completions",
            headers=_get_headers(),
            json=payload,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError):
                        continue
