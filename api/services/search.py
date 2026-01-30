import os
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Setup & Config
load_dotenv()
app = FastAPI()

# The new 2026 Client (automatically looks for GEMINI_API_KEY in .env)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Configure the model with the Google Search Tool
SEARCH_TOOL = types.Tool(
    google_search=types.GoogleSearch()
)

async def generate_ai_search(query: str):
    """Generator function to stream Gemini's response"""
    # Using 'gemini-2.0-flash' (recommended for speed/search in 2026)
    responses = client.models.generate_content_stream(
        model="gemini-2.0-flash",
        contents=query,
        config=types.GenerateContentConfig(
            tools=[SEARCH_TOOL],
            temperature=1.0 # Recommended for search grounding
        )
    )
    
    for chunk in responses:
        if chunk.text:
            yield chunk.text

@app.get("/search")
async def ai_search(q: str = Query(..., min_length=2)):
    """
    Endpoint for React Native to call.
    Usage: http://your-ip:8000/search?q=latest+iphone+news
    """
    return StreamingResponse(generate_ai_search(q), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 is required so your phone can connect to your computer
    uvicorn.run(app, host="0.0.0.0", port=8000)