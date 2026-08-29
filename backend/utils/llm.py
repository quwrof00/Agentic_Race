from openai import AsyncOpenAI
import os
from config import GROQ_API_KEY, GROQ_BASE_URL, BASELINE_MODEL

client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url=GROQ_BASE_URL,
)

async def stream_completion(messages, model=BASELINE_MODEL, usage_counter=None, max_retries=3, **kwargs):
    import asyncio
    
    if usage_counter is not None:
        usage_counter.setdefault('api_calls', 0)
        usage_counter['api_calls'] += 1
        
    stream_options = {"include_usage": True} if usage_counter is not None else None

    for attempt in range(max_retries):
        try:
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
            
            # If successful, exit the function
            return
            
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str.lower():
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"[LLM] Rate limit hit. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
            yield f"[ERROR: {error_str}]"
            return
