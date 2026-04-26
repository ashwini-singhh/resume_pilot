"""
Agent module — replicates the original resume_agent/agent/agent.py
for use within the FastAPI backend.

In FastAPI we are already async, so parse_content is now async natively
instead of the ThreadPoolExecutor workaround used in Streamlit.
"""

import json
import logging
from typing import Optional, Dict, Any

from config.config import Config
from core.llm_client.llm_client import LLMClient
from core.llm_client.response import StreamEventType
from prompts.system import get_prompt_user_profile_generation
from util.response import LLMError

logger = logging.getLogger(__name__)


class Agent:
    def __init__(self, config: Config, llm_client: Optional[LLMClient] = None):
        self.config = config
        self.llm_client = llm_client or LLMClient(config)

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

    async def _get_full_response(self, 
        prompt: str,
        user_id: str = "guest",
        feature: str = "unknown",
        run_id: Optional[str] = None
    ) -> str:
        """Collect the complete LLM response text from the async stream."""
        messages = [{"role": "user", "content": prompt}]
        full_text = ""
        async for event in self.llm_client.chat_completion(
            messages, 
            user_id=user_id, 
            feature=feature, 
            run_id=run_id
        ):
            if event.type == StreamEventType.TEXT_DELTA and event.text_delta:
                full_text += event.text_delta.content
            elif event.type == StreamEventType.MESSAGE_COMPLETE:
                # If we're not streaming, the content might be here
                if event.text_delta and not full_text:
                    full_text = event.text_delta.content
            elif event.type == StreamEventType.ERROR:
                raise LLMError(message=f"LLM Stream Error: {event.error}", code=500, details={"error": event.error})
        
        if not full_text.strip():
            logger.error("LLM returned an empty or whitespace-only response")
            
        return full_text

    async def parse_content(self, 
        content: str, 
        user_context: dict = None,
        user_id: str = "guest",
        feature: str = "agent_parse",
        run_id: Optional[str] = None
    ) -> Dict | None:
        """
        Main entry point to parse content into JSON.
        
        Prepends the Harvard system prompt from prompts/system.py,
        sends to LLM, and parses the JSON response.
        
        This is now an async method (no ThreadPoolExecutor needed in FastAPI).
        """
        system_prompt = get_prompt_user_profile_generation(user_context=user_context)
        prompt = f"{system_prompt}\n----\n{content}"

        logger.info(f"--- Sending parsing request to LLM ({self.config.model_name}) ---")
        try:
            res_text = await self._get_full_response(
                prompt,
                user_id=user_id,
                feature=feature,
                run_id=run_id
            )
            logger.info(f"--- LLM Response Received ({len(res_text)} chars) ---")
            parsed = self._parse_json(res_text)
            if parsed is None:
                raise LLMError(message="LLM returned invalid JSON format", code=500, details={"raw_response": res_text})
            return parsed
        except LLMError:
            raise
        except Exception as e:
            logger.error(f"--- Error in Agent.parse_content: {e} ---")
            if "timeout" in str(e).lower():
                logger.error("--- Error was an AI timeout. Model might be slow or overloaded. ---")
            raise LLMError(message=str(e), code=500)
