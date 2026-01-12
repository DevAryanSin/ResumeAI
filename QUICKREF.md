# 🚀 RezumAI - Quick Reference Card

## 📦 Installation

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend
```powershell
cd frontend
npm install
```

## ⚙️ Configuration

Create `backend/.env`:
```env
GEMINI_API_KEY=your_api_key_here
```

Get API key: https://aistudio.google.com/app/apikey

## ▶️ Running

### Start Backend (Terminal 1)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js + React |
| Backend | FastAPI + Python |
| AI | Gemini 1.5 Flash |
| Storage | localStorage |
| Auth | API Key |

## 📁 Project Structure

```
RezumAI/
├── backend/
│   ├── api/
│   │   └── main.py          # FastAPI app
│   ├── .env                 # Your config (create this)
│   ├── .env.example         # Template
│   └── requirements.txt     # Dependencies
├── frontend/
│   ├── pages/
│   │   └── index.js        # Chat UI
│   └── package.json        # Dependencies
├── README.md               # Full documentation
├── SETUP.md               # Setup guide
└── CHANGES.md             # What changed
```

## 🎯 Key Features

✅ Gemini API integration  
✅ localStorage persistence  
✅ Conversation history  
✅ Modern gradient UI  
✅ No database needed  
✅ Simple setup  

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```powershell
# Check Node version
node --version  # Should be 14+

# Clear and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### API errors
- Verify `GEMINI_API_KEY` in `.env`
- Check backend logs
- Test health endpoint: http://localhost:8000/health

## 📝 API Quick Reference

### POST /chat
```json
// Request
{
  "message": "Hello!",
  "conversation_history": []
}

// Response
{
  "reply": "Hi there!",
  "source": "gemini-1.5-flash"
}
```

## 🎨 Customization

### Change Gemini settings
Edit `backend/api/main.py`:
```python
"generationConfig": {
    "temperature": 0.7,      # 0.0-1.0
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 2048,
}
```

### Change UI colors
Edit `frontend/pages/index.js`:
```javascript
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
```

## 🔐 Security Checklist

- [ ] Never commit `.env` file
- [ ] Keep API key secure
- [ ] Add rate limiting for production
- [ ] Enable HTTPS in production
- [ ] Add authentication for multi-user

## 📚 Documentation

- **Full Guide**: `README.md`
- **Setup**: `SETUP.md`
- **Changes**: `CHANGES.md`
- **Backend**: `backend/README.md`
- **Frontend**: `frontend/README.md`

## 💡 Tips

- Use `Shift+Enter` for new line in chat
- Conversation auto-saves to localStorage
- Clear history button removes all messages
- Backend auto-reloads on code changes (--reload flag)
- Frontend hot-reloads automatically

## 🆘 Need Help?

1. Check `SETUP.md` for detailed instructions
2. Review `CHANGES.md` for what changed
3. Test health endpoint: http://localhost:8000/health
4. Check browser console for frontend errors
5. Check terminal for backend errors

---

**Quick Start**: Get API key → Create `.env` → Run backend → Run frontend → Chat! 🎉
