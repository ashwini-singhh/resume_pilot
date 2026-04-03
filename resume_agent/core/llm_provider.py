"""
Generic LLM Provider Module
Supports any OpenAI-compatible API (OpenAI, Groq, Together, Ollama, etc.)
and Google Gemini natively.

Usage:
    client = LLMClient(api_key="...", base_url="...", model="...", provider="openai")
    response = client.generate("Your prompt here")
"""

import os
import json
import logging
from typing import Optional, Dict

import requests

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Generic LLM client that supports:
    - OpenAI-compatible APIs (POST /v1/chat/completions)
    - Google Gemini (via REST API)
    """

    PROVIDER_OPENAI = "openai"
    PROVIDER_GEMINI = "gemini"

    # Presets for common providers
    PRESETS = {
        "openai": {
            "base_url": "https://api.openai.com/v1",
            "default_model": "gpt-4o-mini",
        },
        "gemini": {
            "base_url": "https://generativelanguage.googleapis.com/v1beta",
            "default_model": "gemini-2.0-flash",
        },
        "groq": {
            "base_url": "https://api.groq.com/openai/v1",
            "default_model": "llama-3.3-70b-versatile",
        },
        "together": {
            "base_url": "https://api.together.xyz/v1",
            "default_model": "meta-llama/Llama-3-70b-chat-hf",
        },
        "ollama": {
            "base_url": "http://localhost:11434/v1",
            "default_model": "llama3",
        },
    }

    def __init__(
        self,
        api_key: str,
        base_url: str = "",
        model: str = "",
        provider: str = "gemini",
    ):
        self.provider = provider.lower().strip()
        preset = self.PRESETS.get(self.provider, {})

        self.api_key = api_key
        self.base_url = (base_url.strip().rstrip("/") or preset.get("base_url", "")).rstrip("/")
        self.model = model.strip() or preset.get("default_model", "")

        if not self.api_key:
            raise ValueError("API key is required")
        if not self.base_url:
            raise ValueError("Base URL is required (or use a known provider preset)")
        if not self.model:
            raise ValueError("Model name is required")

    def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.1,
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a text completion from the LLM.
        Returns the raw text response with automatic retry on rate limits.
        """
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if self.provider == self.PROVIDER_GEMINI:
                    return self._generate_gemini(prompt, system_prompt, temperature, max_tokens)
                else:
                    return self._generate_openai_compatible(prompt, system_prompt, temperature, max_tokens)
            except requests.exceptions.HTTPError as e:
                # Retry on 429 (Rate Limit) or 5xx (Server Error)
                if e.response.status_code == 429 or 500 <= e.response.status_code < 600:
                    if attempt < max_retries - 1:
                        sleep_time = 2 ** (attempt + 1)
                        logger.warning(f"LLM {e.response.status_code} error. Retrying in {sleep_time}s... (Attempt {attempt + 1}/{max_retries})")
                        time.sleep(sleep_time)
                        continue
                raise e
        # Should not reach here
        return ""

    def generate_json(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.1,
        max_tokens: int = 1024,
    ) -> Optional[Dict]:
        """
        Generate and parse a JSON response.
        Returns parsed dict or None on failure.
        """
        print('Prompt: ',prompt)
        print('System: ', system_prompt)
        raw = self.generate(prompt, system_prompt, temperature, max_tokens)
        return self._parse_json(raw)

    # ── OpenAI-Compatible Endpoint ────────────────────────

    def _generate_openai_compatible(
        self, prompt: str, system_prompt: str, temperature: float, max_tokens: int
    ) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        return data["choices"][0]["message"]["content"]

    # ── Gemini Endpoint ───────────────────────────────────

    def _generate_gemini(
        self, prompt: str, system_prompt: str, temperature: float, max_tokens: int
    ) -> str:
        url = (
            f"{self.base_url}/models/{self.model}:generateContent"
            f"?key={self.api_key}"
        )
        headers = {"Content-Type": "application/json"}

        payload: Dict = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "topP": 0.8,
            },
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        # Extract text from Gemini response
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Unexpected Gemini response structure: {e}")
            logger.debug(f"Response: {json.dumps(data, indent=2)[:500]}")
            raise RuntimeError(f"Failed to parse Gemini response: {e}")

    # ── JSON Parsing ──────────────────────────────────────

    @staticmethod
    def _parse_json(text: str) -> Optional[Dict]:
        """Parse JSON from LLM response, handling markdown fences."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to find JSON object in text
            start = cleaned.find("{")
            if start == -1:
                return None
            depth = 0
            for i in range(start, len(cleaned)):
                if cleaned[i] == "{":
                    depth += 1
                elif cleaned[i] == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(cleaned[start : i + 1])
                        except json.JSONDecodeError:
                            return None
        return None

    def __repr__(self) -> str:
        return f"LLMClient(provider={self.provider!r}, model={self.model!r}, base_url={self.base_url!r})"
