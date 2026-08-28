from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json

from agents.baseline import run_baseline
from agents.structured import run_structured_langgraph
from agents.judge import run_judge

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Agentic Race API is running"}

@app.get("/race")
async def race(prompt: str, request: Request):
    """
    SSE endpoint that runs both agents and streams their events.
    """
    
    async def event_generator():
        # Queue for thread-safe event handling
        queue = asyncio.Queue()
        
        async def stream_callback(event):
            # Agents push raw event dicts here
            await queue.put(event)

        async def run_agents():
            try:
                # We need the values returned from gather, so we can't just drop them
                results = await asyncio.gather(
                    run_baseline(prompt, stream_callback),
                    run_structured_langgraph(prompt, stream_callback),
                    return_exceptions=True
                )
                
                baseline_res = None
                structured_res = None
                search_context = ""
                
                if not isinstance(results[0], Exception):
                    baseline_res = results[0]
                else:
                    await queue.put({"agent": "system", "type": "error", "data": f"Baseline error: {str(results[0])}"})
                    
                if not isinstance(results[1], Exception):
                    structured_res, search_context = results[1]
                else:
                    await queue.put({"agent": "system", "type": "error", "data": f"Structured error: {str(results[1])}"})

                # If both returned strings, we can judge them
                if isinstance(baseline_res, str) and isinstance(structured_res, str):
                    try:
                        await run_judge(prompt, baseline_res, structured_res, search_context, stream_callback)
                    except Exception as e:
                        await queue.put({"agent": "system", "type": "error", "data": f"Judge error: {str(e)}"})
                for res in results:
                    if isinstance(res, Exception):
                        await queue.put({"agent": "system", "type": "error", "data": str(res)})
            except asyncio.CancelledError:
                pass
            except Exception as e:
                await queue.put({"agent": "system", "type": "error", "data": str(e)})
            finally:
                # Signal completion
                await queue.put({"agent": "system", "type": "finish", "data": "done"})
                await asyncio.sleep(0.5)
                await queue.put(None)

        # Start agents in background
        task = asyncio.create_task(run_agents())
        
        try:
            while True:
                # Wait with timeout to periodically check for disconnects
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    if await request.is_disconnected():
                        break
                    continue
                
                if event is None:
                    break
                    
                # data: json_string\n\n
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
