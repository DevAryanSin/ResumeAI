import { useState, useEffect } from 'react'

export default function Home() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadedPDFs, setUploadedPDFs] = useState([]) // Array of {filename, text, size}
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Load conversation and PDFs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rezumai_conversation')
    if (saved) {
      try {
        setConversation(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load conversation:', e)
      }
    }

    const savedPDFs = localStorage.getItem('rezumai_pdfs')
    if (savedPDFs) {
      try {
        setUploadedPDFs(JSON.parse(savedPDFs))
      } catch (e) {
        console.error('Failed to load PDFs:', e)
      }
    }
  }, [])

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('rezumai_conversation', JSON.stringify(conversation))
    }
  }, [conversation])

  // Save PDFs to localStorage whenever they change
  useEffect(() => {
    if (uploadedPDFs.length > 0) {
      localStorage.setItem('rezumai_pdfs', JSON.stringify(uploadedPDFs))
    } else {
      localStorage.removeItem('rezumai_pdfs')
    }
  }, [uploadedPDFs])

  async function handleFileUpload(files) {
    const fileArray = Array.from(files)

    // Check total count (max 5 PDFs)
    if (uploadedPDFs.length + fileArray.length > 5) {
      alert('Maximum 5 PDFs allowed. Please remove some files first.')
      return
    }

    // Filter only PDF files
    const pdfFiles = fileArray.filter(file => file.type === 'application/pdf')

    if (pdfFiles.length === 0) {
      alert('Please upload only PDF files')
      return
    }

    setUploading(true)

    for (const file of pdfFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('http://localhost:8000/upload-pdf', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (res.ok) {
          setUploadedPDFs(prev => [...prev, {
            filename: data.filename,
            text: data.extracted_text,
            size: file.size
          }])
        } else {
          alert(`Failed to upload ${file.name}: ${data.detail}`)
        }
      } catch (e) {
        alert(`Error uploading ${file.name}: ${e.message}`)
      }
    }

    setUploading(false)
  }

  function removePDF(index) {
    setUploadedPDFs(prev => prev.filter((_, i) => i !== index))
  }

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  async function send() {
    if (!message.trim()) return

    setLoading(true)
    const userMessage = message.trim()
    setMessage('')

    // Add user message to conversation
    const newConversation = [...conversation, { role: 'user', text: userMessage }]
    setConversation(newConversation)

    // Combine all PDF texts
    const pdfContext = uploadedPDFs.length > 0
      ? uploadedPDFs.map((pdf, idx) =>
        `\n=== PDF ${idx + 1}: ${pdf.filename} ===\n${pdf.text}`
      ).join('\n\n')
      : null

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: conversation,
          pdf_context: pdfContext
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

  function clearAllPDFs() {
    setUploadedPDFs([])
    localStorage.removeItem('rezumai_pdfs')
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>RezumAI Chat</h1>
        <p style={styles.subtitle}>Powered by Gemini 1.5 Flash • Upload PDFs to chat about them</p>
      </div>

      <div style={styles.mainContainer}>
        {/* PDF Upload Section */}
        <div style={styles.sidePanel}>
          <h3 style={styles.sidePanelTitle}>📄 Uploaded PDFs ({uploadedPDFs.length}/5)</h3>

          <div
            style={{
              ...styles.dropZone,
              ...(dragActive ? styles.dropZoneActive : {})
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              style={styles.fileInput}
              id="file-upload"
              disabled={uploading || uploadedPDFs.length >= 5}
            />
            <label htmlFor="file-upload" style={styles.dropZoneLabel}>
              {uploading ? (
                <span>⏳ Uploading...</span>
              ) : uploadedPDFs.length >= 5 ? (
                <span>✓ Maximum reached</span>
              ) : (
                <>
                  <span style={styles.uploadIcon}>📤</span>
                  <span>Click or drag PDFs here</span>
                  <span style={styles.uploadHint}>Max 5 files</span>
                </>
              )}
            </label>
          </div>

          {uploadedPDFs.length > 0 && (
            <>
              <div style={styles.pdfList}>
                {uploadedPDFs.map((pdf, idx) => (
                  <div key={idx} style={styles.pdfItem}>
                    <div style={styles.pdfInfo}>
                      <div style={styles.pdfName}>📄 {pdf.filename}</div>
                      <div style={styles.pdfSize}>{formatFileSize(pdf.size)}</div>
                    </div>
                    <button
                      onClick={() => removePDF(idx)}
                      style={styles.removeButton}
                      title="Remove PDF"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={clearAllPDFs}
                style={styles.clearPDFsButton}
              >
                Clear All PDFs
              </button>
            </>
          )}
        </div>

        {/* Chat Section */}
        <div style={styles.chatContainer}>
          <div style={styles.messagesContainer}>
            {conversation.length === 0 ? (
              <div style={styles.emptyState}>
                <p>👋 Start a conversation with Gemini!</p>
                {uploadedPDFs.length > 0 && (
                  <p style={styles.pdfHint}>
                    💡 {uploadedPDFs.length} PDF{uploadedPDFs.length > 1 ? 's' : ''} loaded.
                    Ask questions about them!
                  </p>
                )}
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
              <div style={{ ...styles.message, ...styles.aiMessage }}>
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
              placeholder={
                uploadedPDFs.length > 0
                  ? "Ask questions about your PDFs... (Press Enter to send)"
                  : "Type your message... (Press Enter to send, Shift+Enter for new line)"
              }
              disabled={loading}
            />
            <div style={styles.buttonContainer}>
              <button
                onClick={clearConversation}
                style={styles.clearButton}
                disabled={conversation.length === 0}
              >
                Clear Chat
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
    marginBottom: '20px',
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  mainContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '20px',
    height: 'calc(100vh - 180px)',
  },
  sidePanel: {
    width: '320px',
    background: 'white',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidePanelTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  dropZone: {
    border: '2px dashed #ccc',
    borderRadius: '12px',
    padding: '30px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    background: '#f8f9fa',
    marginBottom: '15px',
  },
  dropZoneActive: {
    borderColor: '#667eea',
    background: '#f0f2ff',
  },
  fileInput: {
    display: 'none',
  },
  dropZoneLabel: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: '#666',
    fontSize: '14px',
  },
  uploadIcon: {
    fontSize: '32px',
  },
  uploadHint: {
    fontSize: '12px',
    color: '#999',
  },
  pdfList: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '15px',
  },
  pdfItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #e9ecef',
  },
  pdfInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  pdfName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pdfSize: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  removeButton: {
    background: '#fee',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    color: '#c00',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  clearPDFsButton: {
    width: '100%',
    padding: '10px',
    background: 'white',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    transition: 'all 0.2s',
  },
  chatContainer: {
    flex: 1,
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
  pdfHint: {
    fontSize: '14px',
    marginTop: '10px',
    color: '#667eea',
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
