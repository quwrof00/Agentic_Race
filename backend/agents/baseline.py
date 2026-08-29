from utils.llm import stream_completion

async def run_baseline(prompt: str, stream_callback):
    """
    Simple baseline agent: streams response directly.
    """
    await stream_callback({
        "agent": "baseline",
        "type": "status",
        "data": "Thinking...",
    })

    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d")
    messages = [
        {"role": "system", "content": f"You are a helpful AI assistant. Answer the user's query directly and concisely. The current date is {current_date}. Pay strict attention to this date: if an event occurred before this date, it has already happened. Do NOT use raw HTML tags (like <br>) in your response; use standard Markdown formatting instead."},
        {"role": "user", "content": prompt},
    ]

    full_response = ""
    usage_counter = {"total_tokens": 0}
    await stream_callback({"agent": "baseline", "type": "status", "data": "Generating response..."})
    
    async for token in stream_completion(messages, model=BASELINE_MODEL, usage_counter=usage_counter, max_tokens=1500):
        full_response += token
        await stream_callback({
            "agent": "baseline",
            "type": "token",
            "data": token,
        })

    # Completion
    await stream_callback({
        "agent": "baseline",
        "type": "tokens",
        "data": str(usage_counter["total_tokens"]),
    })

    print(f"[Baseline Agent Log] Stream Summary: Used {usage_counter['total_tokens']} tokens.")

    await stream_callback({
        "agent": "baseline",
        "type": "api_calls",
        "data": str(usage_counter.get("api_calls", 0)),
    })

    await stream_callback({
        "agent": "baseline",
        "type": "complete",
        "data": full_response,
    })
    return full_response
