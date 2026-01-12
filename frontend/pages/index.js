import { useState, useEffect } from 'react'

export default function Home() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)

  // Load conversation from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rezumai_conversation')
    if (saved) {
      try {
        setConversation(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load conversation:', e)
      }
    }
  }, [])

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('rezumai_conversation', JSON.stringify(conversation))
    }
  }, [conversation])

  async function send() {
    if (!message.trim()) return

    setLoading(true)
    const userMessage = message.trim()
    setMessage('')

    // Add user message to conversation
    const newConversation = [...conversation, { role: 'user', text: userMessage }]
    setConversation(newConversation)

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          conversation_history: conversation
        }),
      })
      const data = await res.json()
      
      if (res.ok) {
        // Add AI response to conversation
        setConversation([...newConversation, { role: 'model', text: data.reply }])
      } else {
        // Add error message
        setConversation([...newConversation, { 
          role: 'error', 
          text: 'Error: ' + (data.detail || JSON.stringify(data)) 
        }])
      }
    } catch (e) {
      // Add error message
      setConversation([...newConversation, { 
        role: 'error', 
        text: 'Request failed: ' + e.message 
      }])
    } finally {
      setLoading(false)
    }
  }

  function clearConversation() {
    setConversation([])
    localStorage.removeItem('rezumai_conversation')
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>RezumAI Chat</h1>
        <p style={styles.subtitle}>Powered by Gemini 1.5 Flash</p>
      </div>

      <div style={styles.chatContainer}>
        <div style={styles.messagesContainer}>
          {conversation.length === 0 ? (
            <div style={styles.emptyState}>
              <p>👋 Start a conversation with Gemini!</p>
            </div>
          ) : (
            conversation.map((msg, idx) => (
              <div 
                key={idx} 
                style={{
                  ...styles.message,
                  ...(msg.role === 'user' ? styles.userMessage : 
                      msg.role === 'error' ? styles.errorMessage : 
                      styles.aiMessage)
                }}
              >
                <div style={styles.messageRole}>
                  {msg.role === 'user' ? '👤 You' : 
                   msg.role === 'error' ? '⚠️ Error' : 
                   '🤖 Gemini'}
                </div>
                <div style={styles.messageText}>{msg.text}</div>
              </div>
            ))
          )}
          {loading && (
            <div style={{...styles.message, ...styles.aiMessage}}>
              <div style={styles.messageRole}>🤖 Gemini</div>
              <div style={styles.messageText}>
                <span style={styles.loadingDots}>Thinking</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.inputContainer}>
          <textarea
            rows={3}
            style={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            disabled={loading}
          />
          <div style={styles.buttonContainer}>
            <button 
              onClick={clearConversation} 
              style={styles.clearButton}
              disabled={conversation.length === 0}
            >
              Clear History
            </button>
            <button 
              onClick={send} 
              disabled={loading || !message.trim()} 
              style={{
                ...styles.sendButton,
                ...(loading || !message.trim() ? styles.disabledButton : {})
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '30px',
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9,
    margin: 0,
  },
  chatContainer: {
    maxWidth: '900px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 200px)',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '30px',
    background: '#f8f9fa',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '18px',
    marginTop: '100px',
  },
  message: {
    marginBottom: '20px',
    padding: '15px 20px',
    borderRadius: '12px',
    maxWidth: '80%',
    animation: 'slideIn 0.3s ease-out',
  },
  userMessage: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginLeft: 'auto',
  },
  aiMessage: {
    background: 'white',
    border: '2px solid #e9ecef',
    marginRight: 'auto',
  },
  errorMessage: {
    background: '#fee',
    border: '2px solid #fcc',
    color: '#c00',
    marginRight: 'auto',
  },
  messageRole: {
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '8px',
    opacity: 0.8,
  },
  messageText: {
    fontSize: '16px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  loadingDots: {
    display: 'inline-block',
    animation: 'dots 1.5s infinite',
  },
  inputContainer: {
    padding: '20px 30px',
    background: 'white',
    borderTop: '2px solid #e9ecef',
  },
  textarea: {
    width: '100%',
    fontSize: '16px',
    padding: '15px',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    justifyContent: 'flex-end',
  },
  sendButton: {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  clearButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: 'white',
    color: '#6c757d',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
  },
}

