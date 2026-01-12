# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import requests
from typing import Optional, List, Dict
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta
import mimetypes

# Load environment variables
load_dotenv()

logger = logging.getLogger("uvicorn")

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. Please set it in .env file.")

# --- FastAPI App Setup ---
app = FastAPI(title="RezumAI-backend", version="0.3")

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
    pdf_file_uris: Optional[List[str]] = None  # List of Gemini file URIs

class ChatResponse(BaseModel):
    reply: str
    source: str

class PDFUploadResponse(BaseModel):
    filename: str
    file_uri: str  # Gemini file URI
    mime_type: str
    size_bytes: int
    success: bool

# --- Helper Functions ---
def upload_file_to_gemini(pdf_bytes: bytes, filename: str, mime_type: str = "application/pdf") -> Dict:
    """
    Uploads a PDF file directly to Gemini File API.
    Returns the file metadata including URI.
    """
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not configured")
    
    try:
        # Gemini File API upload endpoint
        upload_url = f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={GEMINI_API_KEY}"
        
        # Prepare multipart form data
        files = {
            'file': (filename, pdf_bytes, mime_type)
        }
        
        # Metadata for the file
        metadata = {
            'file': {
                'display_name': filename
            }
        }
        
        headers = {
            'X-Goog-Upload-Protocol': 'multipart'
        }
        
        logger.info(f"Uploading {filename} to Gemini File API...")
        
        response = requests.post(
            upload_url,
            files=files,
            headers=headers,
            timeout=120  # Longer timeout for file uploads
        )
        
        if response.status_code != 200:
            logger.error(f"File upload failed: {response.status_code} - {response.text}")
            raise Exception(f"Failed to upload file to Gemini: {response.text}")
        
        file_data = response.json()
        logger.info(f"Successfully uploaded {filename}. URI: {file_data.get('file', {}).get('uri', 'N/A')}")
        
        return file_data.get('file', {})
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error uploading file to Gemini: {e}")
        raise Exception(f"Failed to upload file: {str(e)}")

def call_gemini_api(message: str, conversation_history: Optional[List[dict]] = None, pdf_file_uris: Optional[List[str]] = None) -> str:
    """
    Calls Gemini API directly using REST endpoint with retry logic and exponential backoff.
    Includes PDF file URIs if provided (files uploaded to Gemini File API).
    """
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not configured")
    
    # Build conversation contents
    contents = []
    
    # Add conversation history if provided
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            # Gemini only supports 'user' and 'model' roles.
            # Filter out 'error' or any other custom roles used in frontend.
            if role in ["user", "model"]:
                contents.append({
                    "role": role,
                    "parts": [{"text": msg.get("text", "")}]
                })
    
    # Build the current message parts
    message_parts = []
    
    # Add PDF file references if available
    if pdf_file_uris:
        for file_uri in pdf_file_uris:
            message_parts.append({
                "file_data": {
                    "mime_type": "application/pdf",
                    "file_uri": file_uri
                }
            })
    
    # Add the text message
    message_parts.append({"text": message})
    
    # Add current message with all parts
    contents.append({
        "role": "user",
        "parts": message_parts
    })
    
    # Gemini API endpoint
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    request_payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 2048,
        }
    }
    
    # Retry configuration
    max_retries = 3
    base_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Calling Gemini API (attempt {attempt + 1}/{max_retries}) with message: {message[:100]}... (PDF context: {len(pdf_context) if pdf_context else 0} chars)")
            
            response = requests.post(
                api_url,
                json=request_payload,
                headers={"Content-Type": "application/json"},
                timeout=60  # Increased timeout for larger contexts
            )
            
            # Handle rate limiting (429)
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    # Calculate exponential backoff delay
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Rate limit hit (429). Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                    continue
                else:
                    # Final attempt failed
                    logger.error(f"Rate limit exceeded after {max_retries} attempts")
                    raise Exception(
                        "Gemini API rate limit exceeded. Please try again in a few moments. "
                        "If this persists, you may have reached your daily quota. "
                        "Check your quota at: https://aistudio.google.com/app/apikey"
                    )
            
            # Handle other errors
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
                        logger.info("Successfully received response from Gemini API")
                        return parts[0]["text"]
            
            raise Exception("Unexpected response format from Gemini API")
            
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.warning(f"Request failed: {e}. Retrying in {delay} seconds...")
                time.sleep(delay)
                continue
            else:
                logger.error(f"Request to Gemini API failed after {max_retries} attempts: {e}")
                raise Exception(f"Failed to connect to Gemini API: {e}")
    
    raise Exception("Failed to get response from Gemini API after all retries")

# --- Endpoints ---
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "gemini_configured": GEMINI_API_KEY is not None
    }

@app.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file directly to Gemini File API.
    Returns the file URI for use in chat queries.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Read PDF file
        pdf_bytes = await file.read()
        
        # Upload to Gemini File API
        file_metadata = upload_file_to_gemini(pdf_bytes, file.filename)
        
        if not file_metadata.get('uri'):
            raise HTTPException(status_code=500, detail="Failed to get file URI from Gemini")
        
        return PDFUploadResponse(
            filename=file.filename,
            file_uri=file_metadata.get('uri'),
            mime_type=file_metadata.get('mimeType', 'application/pdf'),
            size_bytes=len(pdf_bytes),
            success=True
        )
    
    except Exception as e:
        logger.error(f"PDF upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/upload-pdfs-batch")
async def upload_pdfs_batch(files: List[UploadFile] = File(...)):
    """
    Upload multiple PDFs at once (max 1) directly to Gemini File API.
    Returns file URIs for all PDFs.
    """
    if len(files) > 1:
        raise HTTPException(status_code=400, detail="Maximum 1 PDF allowed")
    
    results = []
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            results.append({"filename": file.filename, "success": False, "error": "Not a PDF"})
            continue
        
        try:
            pdf_bytes = await file.read()
            file_metadata = upload_file_to_gemini(pdf_bytes, file.filename)
            results.append({
                "filename": file.filename,
                "file_uri": file_metadata.get('uri'),
                "mime_type": file_metadata.get('mimeType', 'application/pdf'),
                "size_bytes": len(pdf_bytes),
                "success": True
            })
        except Exception as e:
            results.append({"filename": file.filename, "success": False, "error": str(e)})
    
    return {"files": results, "total": len(results)}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Chat endpoint that uses Gemini API.
    Accepts a message, optional conversation history, and optional PDF file URIs.
    """
    if not req.message:
        raise HTTPException(status_code=400, detail="message is required")
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in .env file"
        )

    try:
        reply = call_gemini_api(req.message, req.conversation_history, req.pdf_file_uris)
        return ChatResponse(reply=reply, source="gemini-2.0-flash")

    except Exception as e:
        error_message = str(e)
        logger.error(f"Chat endpoint failed: {e}", exc_info=True)
        
        # Check if it's a rate limit error
        if "rate limit" in error_message.lower() or "429" in error_message:
            raise HTTPException(
                status_code=429,
                detail=error_message
            )
        
        # Generic error
        raise HTTPException(status_code=500, detail=f"Error processing chat: {error_message}")