import asyncio
from openai import AsyncOpenAI, RateLimitError, APIConnectionError, AuthenticationError
from typing import Any, AsyncGenerator, Optional
from .response import StreamEvent, StreamEventType, TokenUsage, TextDelta
from util.response import LLMError


class LLMClient:
    """
    Generic async LLM client using AsyncOpenAI.
    
    Accepts either:
      - A Config object (matching the legacy resume_agent pattern)
      - Direct api_key/base_url/model_name strings
    """

    def __init__(self, config=None, *, api_key: str = "", base_url: str = "", model_name: str = ""):
        if config is not None:
            # Config-based initialization (legacy Agent pattern)
            self.api_key = config.api_key or ""
            self.base_url = (config.base_url or "").strip()
            self.model_name = config.model_name or "gemini-2.0-flash"
        else:
            # Direct initialization (API endpoint pattern)
            self.api_key = api_key
            self.base_url = base_url.strip()
            self.model_name = model_name or "gemini-2.0-flash"

        # Fallback base_url
        if not self.base_url:
            self.base_url = "https://generativelanguage.googleapis.com/v1beta/"

        self.max_retries = 3
        self.client: AsyncOpenAI | None = None

    def get_client(self) -> AsyncOpenAI:
        """Ensure Singularity.
        Returns the client if it is already initialized.
        Otherwise, initializes the client and returns it.
        """
        if self.client is None:
            # OpenRouter headers for analytics and model ranking
            is_openrouter = "openrouter.ai" in self.base_url.lower()
            headers = {
                "HTTP-Referer": "https://resume-pilot.vercel.app",
                "X-Title": "ResumePilot AI",
            } if is_openrouter else {}

            self.client = AsyncOpenAI(
                api_key=self.api_key or "DUMMY",
                base_url=self.base_url,
                timeout=60.0,
                default_headers=headers
            )
        return self.client

    async def close(self) -> None:
        if self.client is None:
            return
        await self.client.close()
        self.client = None

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        stream: bool = False,
        **override_kwargs,
    ) -> AsyncGenerator[StreamEvent, None]:

        client = self.get_client()
        kwargs = {
            "model": self.model_name,
            "messages": messages,
            "stream": stream,
        }
        if "max_tokens" in override_kwargs:
            kwargs["max_tokens"] = override_kwargs["max_tokens"]
        if "temperature" in override_kwargs:
            kwargs["temperature"] = override_kwargs["temperature"]

        for attempt in range(self.max_retries + 1):
            try:
                if stream:
                    async for event in self._stream_response(client, kwargs):
                        yield event
                else:
                    event = await self._non_stream_response(client, kwargs)
                    yield event
                return  # Success, break the retry loop

            except AuthenticationError as e:
                yield StreamEvent(
                    type=StreamEventType.ERROR,
                    error=f"Authentication error: {e}. Please check your API key.",
                )
                return
            except RateLimitError as e:
                if attempt < self.max_retries:
                    wait_time = 2**attempt
                    await asyncio.sleep(wait_time)
                else:
                    yield StreamEvent(
                        type=StreamEventType.ERROR,
                        error=f"Rate limit exceeded: {e}",
                    )
                    return
            except APIConnectionError as e:
                if attempt < self.max_retries:
                    wait_time = 2**attempt
                    await asyncio.sleep(wait_time)
                else:
                    yield StreamEvent(
                        type=StreamEventType.ERROR,
                        error=f"Connection error: {e}",
                    )
                    return
            except Exception as e:
                yield StreamEvent(
                    type=StreamEventType.ERROR,
                    error=str(e),
                )
                return

    async def _stream_response(
        self, client: AsyncOpenAI, kwargs: dict[str, Any]
    ) -> AsyncGenerator[StreamEvent, None]:
        stream = await client.chat.completions.create(**kwargs)
        async for chunk in stream:
            if not getattr(chunk, "choices", None):
                continue
            
            choice = chunk.choices[0]
            if not choice:
                continue
                
            delta = getattr(choice, "delta", None)
            if delta and getattr(delta, "content", None):
                yield StreamEvent(
                    type=StreamEventType.TEXT_DELTA,
                    text_delta=TextDelta(content=delta.content),
                )
            
            if getattr(choice, "finish_reason", None):
                yield StreamEvent(
                    type=StreamEventType.MESSAGE_COMPLETE,
                    finish_reason=choice.finish_reason,
                )

    async def _non_stream_response(
        self, client: AsyncOpenAI, kwargs: dict[str, Any]
    ) -> StreamEvent:
        response = await client.chat.completions.create(**kwargs)
        
        if not getattr(response, "choices", None):
            return StreamEvent(
                type=StreamEventType.ERROR,
                error="LLM provider returned success but with 0 choices.",
            )
            
        choice = response.choices[0]
        message = getattr(choice, "message", None)
        text_delta = None
        if message and getattr(message, "content", None):
            text_delta = TextDelta(content=message.content)
            
        token_usage = None
        if getattr(response, "usage", None):
            token_usage = TokenUsage(
                total_tokens=response.usage.total_tokens,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                cached_tokens=0 # Fallback
            )
            if hasattr(response.usage, "prompt_tokens_details") and response.usage.prompt_tokens_details:
                token_usage.cached_tokens = getattr(response.usage.prompt_tokens_details, "cached_tokens", 0)

        return StreamEvent(
            type=StreamEventType.MESSAGE_COMPLETE,
            text_delta=text_delta,
            usage=token_usage,
            finish_reason=getattr(choice, "finish_reason", None),
        )

    async def generate_json(self, prompt: str, system_prompt: str = "", temperature: float = 0.1, max_tokens: int = 1024) -> Optional[dict]:
        """Helper to get a full JSON response instead of a stream."""
        import json
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        full_text = ""
        async for event in self.chat_completion(messages=messages, stream=False, max_tokens=max_tokens, temperature=temperature):
            if event.type == StreamEventType.MESSAGE_COMPLETE and event.text_delta:
                full_text = event.text_delta.content
                break
            elif event.type == StreamEventType.ERROR:
                # Capture the original error string which often includes the code
                err_msg = event.error or "Unknown LLM Error"
                code = 500
                if "429" in err_msg or "rate limit" in err_msg.lower():
                    code = 429
                elif "401" in err_msg or "authentication" in err_msg.lower():
                    code = 401
                
                raise LLMError(message=err_msg, code=code)

        if not full_text:
            return None

        cleaned = full_text.strip()
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
            # Try to find JSON object or array in text
            start_obj = cleaned.find("{")
            start_arr = cleaned.find("[")
            
            # Find the first occurring valid structure
            start = -1
            if start_obj != -1 and start_arr != -1:
                start = min(start_obj, start_arr)
            elif start_obj != -1:
                start = start_obj
            elif start_arr != -1:
                start = start_arr
                
            if start != -1:
                is_array = (cleaned[start] == "[")
                open_char = "[" if is_array else "{"
                close_char = "]" if is_array else "}"
                depth = 0
                for i in range(start, len(cleaned)):
                    if cleaned[i] == open_char:
                        depth += 1
                    elif cleaned[i] == close_char:
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(cleaned[start : i + 1])
                            except json.JSONDecodeError:
                                break
            print(f"Failed to decode JSON from LLM response: {cleaned[:200]}")
            return None
