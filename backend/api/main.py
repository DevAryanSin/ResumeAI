# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import requests
import fitz  # PyMuPDF
from typing import Optional, List
from dotenv import load_dotenv
import io
import time
from datetime import datetime, timedelta

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
    pdf_context: Optional[str] = None  # Combined text from uploaded PDFs

class ChatResponse(BaseModel):
    reply: str
    source: str

class PDFUploadResponse(BaseModel):
    filename: str
    text_length: int
    extracted_text: str
    success: bool

# --- Helper Functions ---
def extract_text_from_pdf_bytes(pdf_bytes: bytes, filename: str) -> str:
    """
    Extracts text from PDF bytes using PyMuPDF.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page_num, page in enumerate(doc):
            page_text = page.get_text()
            text += f"\n--- Page {page_num + 1} ---\n{page_text}"
        doc.close()
        
        logger.info(f"Extracted {len(text)} characters from {filename}")
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def call_gemini_api(message: str, conversation_history: Optional[List[dict]] = None, pdf_context: Optional[str] = None) -> str:
    """
    Calls Gemini API directly using REST endpoint with retry logic and exponential backoff.
    Includes PDF context if provided.
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
    
    # Build the current message with PDF context if available
    current_message = message
    if pdf_context:
        current_message = f"""I have uploaded some PDF documents. Here is their content:

{pdf_context}

---

Based on the above PDF content, please answer my question:

{message}"""
    
    # Add current message
    contents.append({
        "role": "user",
        "parts": [{"text": current_message}]
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
    Upload a PDF file and extract its text content.
    Returns the extracted text for use in chat queries.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Read PDF file
        pdf_bytes = await file.read()
        
        # Extract text
        extracted_text = extract_text_from_pdf_bytes(pdf_bytes, file.filename)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")
        
        return PDFUploadResponse(
            filename=file.filename,
            text_length=len(extracted_text),
            extracted_text=extracted_text,
            success=True
        )
    
    except Exception as e:
        logger.error(f"PDF upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/upload-pdfs-batch")
async def upload_pdfs_batch(files: List[UploadFile] = File(...)):
    """
    Upload multiple PDFs at once (max 1).
    Returns combined text from all PDFs.
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
            extracted_text = extract_text_from_pdf_bytes(pdf_bytes, file.filename)
            results.append({
                "filename": file.filename,
                "text": extracted_text,
                "text_length": len(extracted_text),
                "success": True
            })
        except Exception as e:
            results.append({"filename": file.filename, "success": False, "error": str(e)})
    
    return {"files": results, "total": len(results)}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Chat endpoint that uses Gemini API.
    Accepts a message, optional conversation history, and optional PDF context.
    """
    if not req.message:
        raise HTTPException(status_code=400, detail="message is required")
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in .env file"
        )

    try:
        reply = call_gemini_api(req.message, req.conversation_history, req.pdf_context)
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