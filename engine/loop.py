import time
import logging
from datetime import datetime
from engine.hkirat_db import Models, Invocations, ToolCalls, PortfolioSize, init_db
from market.quotes import get_quote
from agent.core import get_agent

logging.basicConfig(level=logging.INFO)

def invoke_agent(model_record):
    logging.info(f"Invoking agent for model: {model_record.name}")
    
    # 1. Fetch Indian Market Data
    # Needs format "EXCHANGE:SYMBOL" e.g. "NSE:RELIANCE"
    instruments = ["NSE:RELIANCE", "NSE:HDFCBANK", "NSE:INFY"]
    try:
        quotes = get_quote(instruments)
        market_context = "\\n".join([f"{k}: LTP ₹{v.last_price} (Change: {v.change_pct}%)" for k, v in quotes.items()])
    except Exception as e:
        market_context = f"Failed to fetch live Indian market data: {e}"

    # 2. Prepare the prompt
    prompt = f"""
    You are an expert trader for the Indian Share Market (NSE/BSE).
    You have been invoked {model_record.invocationCount} times.
    
    Live Market Data:
    {market_context}
    
    Based on this data, provide a short trading summary and specify if you want to LONG or SHORT any of these Indian assets.
    """
    
    # 3. Create Invocation Record
    inv = Invocations.create(
        modelId=model_record,
        response="Thinking..."
    )
    
    # 4. Invoke the AI (Using the existing agent core)
    agent = get_agent()
    try:
        # We pass the prompt to the agent and get a string response
        # Note: In a full production setup, this would stream the response to the DB
        response_text = agent.chat(prompt, stream=False)
    except Exception as e:
        response_text = f"Error during AI invocation: {e}"
        
    # 5. Update DB
    inv.response = response_text
    inv.updatedAt = datetime.now()
    inv.save()
    
    model_record.invocationCount += 1
    model_record.save()
    
    # Add a mock portfolio size entry so the UI chart works
    PortfolioSize.create(
        modelId=model_record,
        netPortfolio="200000" # Base capital
    )
    
    logging.info(f"Invocation complete. Saved to DB.")

def main_loop():
    init_db()
    logging.info("Starting Harkirat-style background Indian Trading Agent loop...")
    
    while True:
        models = Models.select()
        for model in models:
            invoke_agent(model)
            
        logging.info("Sleeping for 5 minutes...")
        time.sleep(300)

if __name__ == "__main__":
    main_loop()
