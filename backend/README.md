# RezumAI Backend

FastAPI backend server with direct Gemini API integration.

## Features

- Direct REST API calls to Gemini 1.5 Flash
- No Google Cloud SDK dependencies
- Simple API key authentication
- Conversation history support
- CORS enabled for frontend integration

## Setup

1. Create a virtual environment:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies:
```powershell
pip install -r requirements.txt
```

3. Configure environment:
```powershell
Copy-Item .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

4. Run the server:
```powershell
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "gemini_configured": true
}
```

### POST /chat
Send a message to Gemini.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "conversation_history": [
    {"role": "user", "text": "Previous message"},
    {"role": "model", "text": "Previous response"}
  ]
}
```

**Response:**
```json
{
  "reply": "I'm doing well, thank you for asking!",
  "source": "gemini-1.5-flash"
}
```

## Configuration

Edit `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
HOST=0.0.0.0
PORT=8000
```

## Dependencies

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **python-dotenv**: Environment variable management
- **requests**: HTTP client for Gemini API
- **pydantic**: Data validation

## Development

Run with auto-reload:
```powershell
uvicorn api.main:app --reload
```

View API docs:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
