# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import requests
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("uvicorn")

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. Please set it in .env file.")

# --- FastAPI App Setup ---
app = FastAPI(title="RezumAI-backend", version="0.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    reply: str
    source: str

# --- Helper Functions ---
def call_gemini_api(message: str, conversation_history: Optional[List[dict]] = None) -> str:
    """
    Calls Gemini API directly using REST endpoint.
    """
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not configured")
    
    # Build conversation contents
    contents = []
    
    # Add conversation history if provided
    if conversation_history:
        for msg in conversation_history:
            contents.append({
                "role": msg.get("role", "user"),
                "parts": [{"text": msg.get("text", "")}]
            })
    
    # Add current message
    contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })
    
    # Gemini API endpoint
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    request_payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 2048,
        }
    }
    
    try:
        logger.info(f"Calling Gemini API with message: {message[:100]}...")
        response = requests.post(
            api_url,
            json=request_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
        
        response_json = response.json()
        
        # Extract text from response
        if "candidates" in response_json and len(response_json["candidates"]) > 0:
            candidate = response_json["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                parts = candidate["content"]["parts"]
                if len(parts) > 0 and "text" in parts[0]:
                    return parts[0]["text"]
        
        raise Exception("Unexpected response format from Gemini API")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to Gemini API failed: {e}")
        raise Exception(f"Failed to connect to Gemini API: {e}")

# --- Endpoints ---
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "gemini_configured": GEMINI_API_KEY is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Chat endpoint that uses Gemini API.
    Accepts a message and optional conversation history.
    """
    if not req.message:
        raise HTTPException(status_code=400, detail="message is required")
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in .env file"
        )

    try:
        reply = call_gemini_api(req.message, req.conversation_history)
        return ChatResponse(reply=reply, source="gemini-1.5-flash")

    except Exception as e:
        logger.error(f"Chat endpoint failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")