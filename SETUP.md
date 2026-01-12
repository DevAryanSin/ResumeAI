# Quick Setup Guide

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Step 2: Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment file
Copy-Item .env.example .env

# Edit .env and add your API key
notepad .env
# Replace 'your_gemini_api_key_here' with your actual API key

# Run the server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 3: Frontend Setup (New Terminal)

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

## Step 4: Open Your Browser

Navigate to: `http://localhost:3000`

## Troubleshooting

### Backend won't start
- Make sure Python 3.8+ is installed: `python --version`
- Check if port 8000 is available
- Verify your API key is correct in `.env`

### Frontend won't start
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` and running `npm install` again
- Check if port 3000 is available

### API errors
- Verify your Gemini API key is valid
- Check the backend logs for detailed error messages
- Make sure you have internet connectivity

## Testing

1. Backend health check: `http://localhost:8000/health`
2. Should return: `{"status": "ok", "gemini_configured": true}`

## Need Help?

Check the main README.md for more detailed information.
