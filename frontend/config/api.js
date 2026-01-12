// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
    HEALTH: `${API_BASE_URL}/health`,
    UPLOAD_PDF: `${API_BASE_URL}/upload-pdf`,
    UPLOAD_PDFS_BATCH: `${API_BASE_URL}/upload-pdfs-batch`,
    CHAT: `${API_BASE_URL}/chat`,
}

export default API_BASE_URL
