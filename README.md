# RezumAI - Gemini Chat Application

A simple, modern chat application powered by Google's Gemini API with conversation persistence using browser localStorage.

## 🌟 Features

- **Gemini 1.5 Flash Integration**: Direct API integration with Google's latest Gemini model
- **Local Storage Persistence**: Conversations are saved in browser localStorage
- **Modern UI**: Beautiful gradient design with smooth animations
- **Conversation History**: Full conversation context maintained
- **No Database Required**: Everything runs client-side with localStorage
- **Simple Setup**: Just add your Gemini API key and run

## 🏗️ Architecture

- **Backend**: FastAPI server with direct Gemini API REST calls
- **Frontend**: Next.js with React hooks and localStorage
- **Storage**: Browser localStorage (no database needed)
- **AI**: Google Gemini 1.5 Flash via REST API

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+
- Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Backend Setup

1. Navigate to the backend directory:
```powershell
cd backend
```

2. Create a virtual environment and activate it:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

3. Install dependencies:
```powershell
pip install -r requirements.txt
```

4. Create a `.env` file from the example:
```powershell
Copy-Item .env.example .env
```

5. Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
```

6. Run the backend server:
```powershell
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```powershell
cd frontend
```

2. Install dependencies:
```powershell
npm install
```

3. Run the development server:
```powershell
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📁 Project Structure

```
RezumAI/
├── backend/
│   ├── api/
│   │   └── main.py          # FastAPI app with Gemini integration
│   ├── .env.example         # Environment variables template
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── pages/
│   │   ├── index.js        # Main chat interface
│   │   └── _app.js         # Next.js app wrapper
│   └── package.json        # Node dependencies
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
HOST=0.0.0.0
PORT=8000
```

### Frontend Configuration

The frontend is configured to connect to `http://localhost:8000` by default. If you need to change this, edit the API URL in `frontend/pages/index.js`.

## 💡 Usage

1. Start both the backend and frontend servers
2. Open your browser to `http://localhost:3000`
3. Start chatting with Gemini!
4. Your conversation history is automatically saved in localStorage
5. Use "Clear History" to start fresh

## 🎨 Features in Detail

### Conversation Persistence
- All conversations are saved to browser localStorage
- Conversations persist across page refreshes
- Clear history with one click

### Modern UI
- Gradient background with purple theme
- Smooth animations and transitions
- Responsive design
- Message bubbles for user and AI
- Loading indicators

### API Integration
- Direct REST API calls to Gemini
- Conversation context maintained
- Error handling and display
- Configurable generation parameters

## 🔒 Security Notes

- Never commit your `.env` file with real API keys
- The `.env` file is already in `.gitignore`
- Keep your Gemini API key secure
- Consider rate limiting for production use

## 🛠️ Development

### Backend API Endpoints

- `GET /health` - Health check endpoint
- `POST /chat` - Send a message to Gemini
  - Request body: `{ "message": "string", "conversation_history": [] }`
  - Response: `{ "reply": "string", "source": "gemini-1.5-flash" }`

### Customization

You can customize the Gemini API parameters in `backend/api/main.py`:

```python
"generationConfig": {
    "temperature": 0.7,      # Creativity (0.0 - 1.0)
    "topK": 40,              # Top K sampling
    "topP": 0.95,            # Top P sampling
    "maxOutputTokens": 2048, # Max response length
}
```

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Note**: This is a simplified version that uses only Gemini API with localStorage. No Google Cloud services (Firestore, GCS, Vector Search) or databases are required.
