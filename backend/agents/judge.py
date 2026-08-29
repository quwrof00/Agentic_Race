from utils.llm import stream_completion
import json

async def run_judge(prompt: str, baseline_response: str, structured_response: str, search_context: str, stream_callback):
    """
    Judge agent: Evaluates the responses of the baseline and structured agents
    and provides an accuracy score for each based on the original prompt.
    """
    await stream_callback({
        "agent": "judge",
        "type": "status",
        "data": "Evaluating responses...",
    })

    # Aggressive truncation to prevent context window blowouts on 20b models
    # This prevents the LLM from silently failing and returning an empty string.
    max_chars = 3000
    if len(baseline_response) > max_chars:
        baseline_response = baseline_response[:max_chars] + "\n...[TRUNCATED]"
    if len(structured_response) > max_chars:
        structured_response = structured_response[:max_chars] + "\n...[TRUNCATED]"
    if len(search_context) > max_chars:
        search_context = search_context[:max_chars] + "\n...[TRUNCATED]"


    usage_counter = {"total_tokens": 0}

    judge_prompt = f"""
You are an impartial, expert AI Judge. Your task is to evaluate two different AI responses to a given user prompt and assign an accuracy score (0-100) to each.

User Prompt:
"{prompt}"

{search_context}
---
Agent 1 (Baseline) Response:
{baseline_response}

---
Agent 2 (Structured) Response:
{structured_response}

---
Evaluate both responses based on:
1. Accuracy: Is the information factually correct based on the current Search Context provided?
   - CRITICAL PENALTY: If an agent provides outdated, hallucinated, or completely incorrect factual information (especially for recent events, news, or metrics), its accuracy score MUST be severely penalized (e.g., 0-10%). Do not give partial credit for formatting if the facts are wrong.
2. Completeness: Did it fully answer the prompt?
3. Helpfulness: Is it useful to the user?

Return ONLY valid JSON in this exact format:
{{
  "baseline_score": <number 0-100>,
  "structured_score": <number 0-100>,
  "dimensions": {{
    "accuracy": {{"baseline": <number 0-100>, "structured": <number 0-100>}},
    "completeness": {{"baseline": <number 0-100>, "structured": <number 0-100>}},
    "helpfulness": {{"baseline": <number 0-100>, "structured": <number 0-100>}}
  }},
  "reasoning": "<A brief 1-2 sentence explanation of your scoring>",
  "educational_breakdown": "<A 2-3 sentence analysis of WHY the structured agent's workflow (planning, searching, reflecting) helped or hurt compared to the baseline's raw speed. Use this to educate developers on Agentic AI trade-offs.>"
}}
"""

    messages = [
        {"role": "system", "content": "You are a specialized JSON-only output bot. You must ONLY output a valid JSON object. Do not include any conversational text, explanations, or thoughts outside of the JSON object."},
        {"role": "user", "content": judge_prompt},
    ]

    full_response = ""
    async for token in stream_completion(messages, temperature=0.1, usage_counter=usage_counter, max_tokens=300):
        full_response += token
        # We don't stream the judge's tokens to the UI, just the final result, 
        # but we could log it if needed.

    await stream_callback({
        "agent": "judge",
        "type": "tokens",
        "data": str(usage_counter["total_tokens"]),
    })

    print(f"[Judge Agent Log] Stream Summary: Used {usage_counter['total_tokens']} tokens.")
    
    # Parse Judge Result
    full_response = full_response.strip()
    try:
        clean_json = full_response
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
        else:
            start_idx = clean_json.find('{')
            end_idx = clean_json.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                clean_json = clean_json[start_idx:end_idx+1]
                
        judge_json = json.loads(clean_json)
        
        # Ensure fallback defaults if parsing succeeds but fields are missing
        baseline_score = judge_json.get("baseline_score", 50)
        structured_score = judge_json.get("structured_score", 50)
        dimensions = judge_json.get("dimensions", {
            "accuracy": {"baseline": 50, "structured": 50},
            "completeness": {"baseline": 50, "structured": 50},
            "helpfulness": {"baseline": 50, "structured": 50}
        })
        reasoning = judge_json.get("reasoning", "No reasoning provided.")
        educational_breakdown = judge_json.get("educational_breakdown", "No breakdown provided.")
        
        result_data = {
            "baseline_score": baseline_score,
            "structured_score": structured_score,
            "dimensions": dimensions,
            "reasoning": reasoning,
            "educational_breakdown": educational_breakdown
        }
        
    except Exception as e:
        print(f"[Judge Agent Log] Error parsing judge JSON: {e}")
        print(f"[Judge Agent Log] Raw response was: {full_response}")
        result_data = {
            "baseline_score": 50,
            "structured_score": 50,
            "dimensions": {
                "accuracy": {"baseline": 50, "structured": 50},
                "completeness": {"baseline": 50, "structured": 50},
                "helpfulness": {"baseline": 50, "structured": 50}
            },
            "reasoning": "Failed to parse judge output.",
            "educational_breakdown": "Failed to parse judge output."
        }

    await stream_callback({
        "agent": "judge",
        "type": "complete",
        "data": result_data,
    })
