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

    messages = [
        {"role": "system", "content": "You are a helpful AI assistant. Answer the user's query directly and concisely."},
        {"role": "user", "content": prompt},
    ]

    full_response = ""
    usage_counter = {"total_tokens": 0}
    await stream_callback({"agent": "baseline", "type": "status", "data": "Generating response..."})
    
    async for token in stream_completion(messages, usage_counter=usage_counter):
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
