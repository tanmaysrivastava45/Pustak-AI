import { supabase } from './supabase.js';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api/v1';
const cleanUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
const API_BASE_URL = cleanUrl.includes('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;

async function request(endpoint, options = {}) {
  // 1. Get current Supabase session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.statusCode = response.status;
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Profile
  getMe: () => request('/me'),

  // Notebooks
  getNotebooks: () => request('/notebooks'),
  createNotebook: (title) => request('/notebooks', {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  getNotebook: (notebookId) => request(`/notebooks/${notebookId}`),
  updateNotebook: (notebookId, title) => request(`/notebooks/${notebookId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }),
  deleteNotebook: (notebookId) => request(`/notebooks/${notebookId}`, {
    method: 'DELETE',
  }),

  // Documents
  getDocuments: (notebookId) => request(`/notebooks/${notebookId}/documents`),
  uploadDocument: (notebookId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/notebooks/${notebookId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },
  getDocument: (documentId) => request(`/documents/${documentId}`),
  getDocumentStatus: (documentId) => request(`/documents/${documentId}/status`),
  getDocumentViewUrl: (documentId) => request(`/documents/${documentId}/view-url`),
  reprocessDocument: (documentId) => request(`/documents/${documentId}/reprocess`, {
    method: 'POST',
  }),
  deleteDocument: (documentId) => request(`/documents/${documentId}`, {
    method: 'DELETE',
  }),

  // Conversations & Messages
  getConversations: (notebookId) => request(`/notebooks/${notebookId}/conversations`),
  createConversation: (notebookId, title) => request(`/notebooks/${notebookId}/conversations`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  getMessages: (conversationId) => request(`/conversations/${conversationId}/messages`),

  // AI & RAG
  chat: (notebookId, { conversationId, question, documentIds }) => request(`/notebooks/${notebookId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ conversationId, question, documentIds }),
  }),
  summarize: (documentId, { summaryType = 'concise', forceRefresh = false } = {}) => request(`/documents/${documentId}/summarize`, {
    method: 'POST',
    body: JSON.stringify({ summaryType, forceRefresh }),
  }),
  suggestedQuestions: (notebookId) => request(`/notebooks/${notebookId}/suggested-questions`, {
    method: 'POST',
  }),
};
