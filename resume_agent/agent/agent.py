import json
import asyncio
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor
from config.config import Config
from llm_client.llm_client import LLMClient
from prompts.system import get_prompt_user_profile_generation
from llm_client.response import StreamEventType


class Agent:
    def __init__(self, config: Config):
        self.config = config
        self.llm_client = LLMClient(config)

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

    async def _get_full_response(self, prompt: str) -> str:
        messages = [{"role": "user", "content": prompt}]
        full_text = ""
        async for event in self.llm_client.chat_completion(messages):
            if event.type == StreamEventType.TEXT_DELTA and event.text_delta:
                full_text += event.text_delta.content
            elif event.type == StreamEventType.MESSAGE_COMPLETE and event.text_delta:
                # In case of non-stream, message_complete has the full text delta
                if event.text_delta:
                    full_text = event.text_delta.content
            elif event.type == StreamEventType.ERROR:
                raise RuntimeError(event.error)
        return full_text

    def parse_content(self, content: str) -> Dict | None:
        """Main entry point to parse content into JSON synchronously."""
        system_prompt = get_prompt_user_profile_generation()
        prompt = f"{system_prompt}\n----\n{content}"
        
        print(f"--- Sending parsing request to LLM ({self.config.model_name}) ---")
        try:
            # Standard robust pattern for calling async from sync (Thread-safe for Streamlit)
            with ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, self._get_full_response(prompt))
                res_text = future.result()
            
            print(f"--- LLM Response Received ({len(res_text)} chars) ---")
            return self._parse_json(res_text)
        except Exception as e:
            print(f"--- Error in Agent.parse_content: {e} ---")
            if "timeout" in str(e).lower():
                print("--- Error was an AI timeout. Model might be slow or overloaded. ---")
            return None
