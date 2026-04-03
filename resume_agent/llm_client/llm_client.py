import asyncio
from openai import AsyncOpenAI, RateLimitError, APIConnectionError, AuthenticationError
from typing import Any, AsyncGenerator
from config.config import Config
from .response import StreamEvent, StreamEventType, TokenUsage, TextDelta

class LLMClient:
    def __init__(self, config: Config):
        self.config = config
        self.max_retries = 3
        self.client: AsyncOpenAI | None = None

    def get_client(self) -> AsyncOpenAI:
        """Ensure Singularity.
        Returns the client if it is already initialized.
        Otherwise, initializes the client and returns it.
        """
        if self.client is None:
            self.client = AsyncOpenAI(
                api_key=self.config.api_key or "DUMMY",   
                base_url=self.config.base_url,
                timeout=60.0,
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
    ) -> AsyncGenerator[StreamEvent, None]:

        client = self.get_client()
        kwargs = {
            "model": self.config.model_name,
            "messages": messages,
            "stream": stream,
        }
       
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
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta.content:
                yield StreamEvent(
                    type=StreamEventType.TEXT_DELTA,
                    text_delta=TextDelta(content=delta.content),
                )
            if chunk.choices[0].finish_reason:
                yield StreamEvent(
                    type=StreamEventType.MESSAGE_COMPLETE,
                    finish_reason=chunk.choices[0].finish_reason,
                )

    async def _non_stream_response(
        self, client: AsyncOpenAI, kwargs: dict[str, Any]
    ) -> StreamEvent:
        response = await client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        message = choice.message
        text_delta = None
        if message.content:
            text_delta = TextDelta(content=message.content)
        
        token_usage = None
        if response.usage:
            token_usage = TokenUsage(
                total_tokens=response.usage.total_tokens,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                cached_tokens=(
                    getattr(response.usage.prompt_tokens_details, "cached_tokens", 0)
                    if hasattr(response.usage, "prompt_tokens_details")
                    else 0
                ),
            )

        return StreamEvent(
            type=StreamEventType.MESSAGE_COMPLETE,
            text_delta=text_delta,
            usage=token_usage,
            finish_reason=choice.finish_reason,
        )