import json
import os
from typing import TypedDict, List, Literal, Optional, Callable
from dotenv import load_dotenv
from tavily import TavilyClient

# LangGraph Imports
from langgraph.graph import StateGraph, START, END

# Your Existing LLM Utility
from utils.llm import stream_completion

# Load Env
load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
MAX_REFLECTION_RETRIES = 1


# -----------------------------------------------------------------------------
# 1. Define State (Shared Memory)
# -----------------------------------------------------------------------------
class AgentState(TypedDict):
    prompt: str
    search_context: str
    plan: List[str]
    final_answer: str
    is_satisfied: Optional[bool]
    reflection_reason: Optional[str]
    iterations: int
    stream_callback: Callable
    usage_counter: dict
    search_needed: bool
    search_query_override: Optional[str]  # NEW


# -----------------------------------------------------------------------------
# 2. Helper: Robust JSON Parsing
# -----------------------------------------------------------------------------
def parse_json_safely(text: str, fallback_bool_key: str = None):
    clean_json = text.strip()
    try:
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
        else:
            start_idx = clean_json.find('{')
            end_idx = clean_json.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                clean_json = clean_json[start_idx:end_idx + 1]

        return json.loads(clean_json)
    except Exception:
        if fallback_bool_key:
            text_lower = text.lower()
            if "true" in text_lower and "false" not in text_lower:
                return {fallback_bool_key: True}
            else:
                return {fallback_bool_key: False}
        return {}


# -----------------------------------------------------------------------------
# 3. Nodes
# -----------------------------------------------------------------------------

async def check_search_need(state: AgentState):
    callback = state["stream_callback"]
    usage_counter = state["usage_counter"]

    await callback({
        "agent": "structured",
        "type": "status",
        "data": "Checking if web search is needed..."
    })

    # Use override if reflection requested a specific query
    query = state.get("search_query_override") or state["prompt"]

    search_check_prompt = f"""
Does the following user request require doing a real-time web search or gathering recent/updated information?
Return ONLY valid JSON in this format:

{{
  "search_needed": true
}}

or

{{
  "search_needed": false
}}

User Request:
"{query}"
"""

    search_needed_text = ""
    async for token in stream_completion(
        [
            {"role": "system", "content": "You are a specialized JSON-only output bot."},
            {"role": "user", "content": search_check_prompt}
        ],
        temperature=0.0,
        usage_counter=usage_counter
    ):
        search_needed_text += token

    search_json = parse_json_safely(search_needed_text, fallback_bool_key="search_needed")
    is_search_needed = search_json.get("search_needed", False)

    combined_context = state.get("search_context", "")

    if is_search_needed:
        await callback({
            "agent": "structured",
            "type": "status",
            "data": f"Searching web for: {query}"
        })

        try:
            tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
            search_res = tavily_client.search(query=query, search_depth="basic")
            results = search_res.get("results", [])

            new_context = "\n--- Additional Web Search Context ---\n"
            for r in results[:5]:
                if isinstance(r, dict):
                    title = r.get("title") or "No Title"
                    content = r.get("content") or ""
                    url = r.get("url") or ""
                    new_context += f"- {title}\n  {content}\n  {url}\n\n"

            # Append instead of overwrite
            combined_context += new_context
            
            # Increment API calls for Tavily search
            usage_counter.setdefault('api_calls', 0)
            usage_counter['api_calls'] += 1

        except Exception as e:
            print(f"[LangGraph] Tavily search failed: {e}")

    return {
        "search_context": combined_context,
        "search_needed": is_search_needed,
        "search_query_override": None,  # Reset override
        "usage_counter": usage_counter
    }


async def generate_plan(state: AgentState):
    callback = state["stream_callback"]
    usage_counter = state["usage_counter"]

    await callback({
        "agent": "structured",
        "type": "status",
        "data": "Generating Plan..."
    })

    plan_prompt = f"""
You are a planning module.

User request:
"{state['prompt']}"
{state['search_context']}

Return ONLY valid JSON:
{{
  "steps": ["step 1", "step 2", "step 3"]
}}

Rules:
- 3 to 5 concise steps
- No explanations
"""

    plan_text = ""
    async for token in stream_completion(
        [
            {"role": "system", "content": "JSON only."},
            {"role": "user", "content": plan_prompt}
        ],
        temperature=0.2,
        usage_counter=usage_counter
    ):
        plan_text += token

    plan_json = parse_json_safely(plan_text)
    steps = plan_json.get("steps", [])

    if not isinstance(steps, list) or not steps:
        steps = ["Execute user request directly"]

    await callback({
        "agent": "structured",
        "type": "plan",
        "data": steps
    })

    return {
        "plan": steps,
        "usage_counter": usage_counter
    }


async def execute_plan(state: AgentState):
    callback = state["stream_callback"]
    usage_counter = state["usage_counter"]

    await callback({
        "agent": "structured",
        "type": "status",
        "data": "Executing Plan..."
    })

    execution_prompt = f"""
User Request:
{state['prompt']}

{state['search_context']}

Plan:
{json.dumps(state['plan'], indent=2)}

Provide a natural, comprehensive answer.
"""

    final_answer = ""
    async for token in stream_completion(
        [
            {"role": "system", "content": "Natural language only."},
            {"role": "user", "content": execution_prompt}
        ],
        temperature=0.2,
        usage_counter=usage_counter
    ):
        final_answer += token
        await callback({
            "agent": "structured",
            "type": "token",
            "data": token
        })

    return {
        "final_answer": final_answer,
        "usage_counter": usage_counter
    }


async def reflect(state: AgentState):
    callback = state["stream_callback"]
    usage_counter = state["usage_counter"]
    iterations = state.get("iterations", 0)

    await callback({
        "agent": "structured",
        "type": "status",
        "data": "Reflecting on Output..."
    })

    reflection_prompt = f"""
User Request:
{state['prompt']}

Answer:
{state['final_answer']}

Return ONLY valid JSON:

{{
  "action": "complete",
  "reason": ""
}}

OR

{{
  "action": "refine",
  "reason": "<what is wrong>"
}}

OR

{{
  "action": "search",
  "reason": "<missing info>",
  "search_query": "<specific search query>"
}}
"""

    reflection_text = ""
    async for token in stream_completion(
        [
            {"role": "system", "content": "JSON only."},
            {"role": "user", "content": reflection_prompt}
        ],
        temperature=0.2,
        usage_counter=usage_counter
    ):
        reflection_text += token

    reflection_json = parse_json_safely(reflection_text)

    action = reflection_json.get("action", "complete")
    reason = reflection_json.get("reason", "")

    # Global retry cap
    if iterations >= MAX_REFLECTION_RETRIES:
        action = "complete"

    return {
        "is_satisfied": action == "complete",
        "reflection_reason": reason,
        "search_query_override": reflection_json.get("search_query") if action == "search" else None,
        "iterations": iterations + 1,
        "usage_counter": usage_counter
    }


async def refine_answer(state: AgentState):
    callback = state["stream_callback"]
    usage_counter = state["usage_counter"]

    await callback({
        "agent": "structured",
        "type": "clear",
        "data": ""
    })

    refinement_prompt = f"""
User Request:
{state['prompt']}

Previous Answer:
{state['final_answer']}

Issue:
{state['reflection_reason']}

Provide an improved answer.
"""

    improved_answer = ""
    async for token in stream_completion(
        [
            {"role": "system", "content": "Natural language only."},
            {"role": "user", "content": refinement_prompt}
        ],
        temperature=0.2,
        usage_counter=usage_counter
    ):
        improved_answer += token
        await callback({
            "agent": "structured",
            "type": "token",
            "data": token
        })

    return {
        "final_answer": improved_answer,
        "usage_counter": usage_counter
    }


# -----------------------------------------------------------------------------
# 4. Routing
# -----------------------------------------------------------------------------

def route_after_reflection(state: AgentState) -> Literal["refine_answer", "check_search", "END"]:
    if state.get("is_satisfied"):
        return "END"

    if state.get("search_query_override"):
        return "check_search"

    return "refine_answer"


# -----------------------------------------------------------------------------
# 5. Build Graph
# -----------------------------------------------------------------------------

def build_structured_agent():
    workflow = StateGraph(AgentState)

    workflow.add_node("check_search", check_search_need)
    workflow.add_node("generate_plan", generate_plan)
    workflow.add_node("execute_plan", execute_plan)
    workflow.add_node("reflect", reflect)
    workflow.add_node("refine_answer", refine_answer)

    workflow.add_edge(START, "check_search")
    workflow.add_edge("check_search", "generate_plan")
    workflow.add_edge("generate_plan", "execute_plan")
    workflow.add_edge("execute_plan", "reflect")

    workflow.add_conditional_edges(
        "reflect",
        route_after_reflection,
        {
            "refine_answer": "refine_answer",
            "check_search": "check_search",
            "END": END
        }
    )

    workflow.add_edge("refine_answer", "reflect")

    return workflow.compile()


# -----------------------------------------------------------------------------
# 6. Runner
# -----------------------------------------------------------------------------

async def run_structured_langgraph(prompt: str, stream_callback: Callable):
    app = build_structured_agent()

    initial_state = {
        "prompt": prompt,
        "search_context": "",
        "plan": [],
        "final_answer": "",
        "is_satisfied": None,
        "reflection_reason": None,
        "iterations": 0,
        "stream_callback": stream_callback,
        "usage_counter": {"total_tokens": 0},
        "search_needed": False,
        "search_query_override": None
    }

    final_state = await app.ainvoke(initial_state)

    await stream_callback({
        "agent": "structured",
        "type": "tokens",
        "data": str(final_state["usage_counter"]["total_tokens"])
    })

    await stream_callback({
        "agent": "structured",
        "type": "api_calls",
        "data": str(final_state["usage_counter"].get("api_calls", 0))
    })

    await stream_callback({
        "agent": "structured",
        "type": "complete",
        "data": "Done"
    })

    return final_state["final_answer"], final_state["search_context"]