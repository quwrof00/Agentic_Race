from openai import AsyncOpenAI
import os
from config import GROQ_API_KEY, GROQ_BASE_URL, MODEL_NAME

client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url=GROQ_BASE_URL,
)

async def stream_completion(messages, model=MODEL_NAME, usage_counter=None, **kwargs):
    if usage_counter is not None:
        usage_counter.setdefault('api_calls', 0)
        usage_counter['api_calls'] += 1
    try:
        # Request usage stats if a counter was provided
        stream_options = {"include_usage": True} if usage_counter is not None else None
        
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            stream_options=stream_options,
            **kwargs
        )
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                
            # If the chunk has usage data, add it to our counter
            if usage_counter is not None and hasattr(chunk, 'usage') and chunk.usage:
                usage_counter['total_tokens'] += chunk.usage.total_tokens
                
    except Exception as e:
        yield f"[ERROR: {str(e)}]"
