# RezumAI Frontend

Modern chat interface built with Next.js and React.

## Features

- Beautiful gradient UI design
- **PDF File Upload**: Drag and drop support for up to 5 PDFs
- Conversation history with localStorage persistence
- Real-time message updates
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Loading indicators
- Error handling and display
- Clear conversation history

## Setup

1. Install dependencies:
```powershell
npm install
```

2. Run the development server:
```powershell
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Local Storage

The application uses browser localStorage to persist conversations:

- **Key**: `rezumai_conversation`
- **Format**: JSON array of message objects
- **Structure**: `[{ role: "user|model|error", text: "message" }]`

## Customization

### Styling

All styles are defined inline in `pages/index.js`. Key style objects:

- `container`: Main app container with gradient background
- `chatContainer`: Chat window
- `message`: Individual message bubbles
- `userMessage`: User message styling
- `aiMessage`: AI response styling

### Colors

Current theme uses purple gradient:
- Primary: `#667eea` to `#764ba2`
- Background: `#f8f9fa`
- Borders: `#e9ecef`

### API Endpoint

To change the backend URL, edit the fetch call in `pages/index.js`:

```javascript
const res = await fetch('http://localhost:8000/chat', {
  // ...
})
```

## Features in Detail

### Conversation Management
- Messages are automatically saved to localStorage
- History persists across page refreshes
- Clear history button removes all messages

### Message Types
- **User messages**: Purple gradient, right-aligned
- **AI responses**: White with border, left-aligned
- **Error messages**: Red background, left-aligned

### Keyboard Shortcuts
- `Enter`: Send message
- `Shift + Enter`: New line in message

## Development

```powershell
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Dependencies

- **react**: UI library
- **next**: React framework
- No additional dependencies required!

## Browser Support

Works in all modern browsers that support:
- localStorage API
- ES6+ JavaScript
- CSS Grid and Flexbox
