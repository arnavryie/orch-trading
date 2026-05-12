import json

def enforce_json(raw_llm_output: str) -> dict | None:
    """
    Forces the LLM output into a strict broker-friendly dictionary.
    Use an API call to a smaller model (like GPT-4o-mini) if regex fails.
    """
    # TODO: Use an LLM with 'response_format={"type": "json_object"}' here
    # For now, a mock parser:
    try:
        # Assuming the LLM was prompted to return ONLY JSON:
        # return json.loads(raw_llm_output) 
        
        # Mocking the output for the example:
        return {"action": "BUY", "symbol": "NIFTY", "qty": 50, "type": "MARKET"}
    except json.JSONDecodeError:
        print("Translator failed to parse LLM output.")
        return None
