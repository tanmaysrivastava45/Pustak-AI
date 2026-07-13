import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Navbar } from '../components/Navbar.jsx';
import { SourcesPanel } from '../features/sources/SourcesPanel.jsx';
import { ChatPanel } from '../features/chat/ChatPanel.jsx';
import { StudioPanel } from '../features/studio/StudioPanel.jsx';
import { DocumentViewerModal } from '../components/DocumentViewerModal.jsx';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  FolderOpen,
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export function WorkspacePage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();

  // Data states
  const [notebook, setNotebook] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);

  // UI / Action states
  const [isLoadingNotebook, setIsLoadingNotebook] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState(null);

  // Panel collapse states (desktop)
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Mobile active tab: 'sources' | 'chat' | 'studio'
  const [mobileTab, setMobileTab] = useState('chat');

  // Document Viewer Modal State
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    documentId: null,
    documentName: '',
    pageNumber: 1,
  });

  // 1. Initial Load: Fetch Notebook, Documents, Conversations
  const loadWorkspace = useCallback(async () => {
    try {
      setIsLoadingNotebook(true);
      const [nbRes, docsRes, convsRes] = await Promise.all([
        api.getNotebook(notebookId),
        api.getDocuments(notebookId),
        api.getConversations(notebookId),
      ]);

      setNotebook(nbRes.data);
      const docs = docsRes.data || [];
      setDocuments(docs);

      // Select all ready documents by default
      const readyDocIds = docs.filter(d => d.status === 'ready').map(d => d.id);
      setSelectedDocIds(readyDocIds);

      const convs = convsRes.data || [];
      setConversations(convs);

      if (convs.length > 0) {
        setActiveConversationId(convs[0].id);
      } else {
        // Create initial conversation if none exists
        const newConv = await api.createConversation(notebookId, 'Initial Chat');
        setConversations([newConv.data]);
        setActiveConversationId(newConv.data.id);
      }
    } catch (err) {
      console.error('Failed to load notebook workspace:', err);
      // In demo mode or if notebook missing, redirect or alert
      navigate('/dashboard');
    } finally {
      setIsLoadingNotebook(false);
    }
  }, [notebookId, navigate]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // 2. Load Messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    api.getMessages(activeConversationId)
      .then(res => {
        if (!isMounted) return;
        setMessages(res.data?.messages || []);
      })
      .catch(err => {
        console.error('Failed to fetch messages:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  // 3. Document Status Polling helper
  const pollDocuments = useCallback(async () => {
    try {
      const res = await api.getDocuments(notebookId);
      const updatedDocs = res.data || [];
      setDocuments(updatedDocs);

      // Automatically include newly ready documents in selected list
      setSelectedDocIds(prev => {
        const newlyReady = updatedDocs
          .filter(d => d.status === 'ready' && !prev.includes(d.id))
          .map(d => d.id);
        return [...prev, ...newlyReady];
      });
    } catch (err) {
      console.error('Document polling error:', err);
    }
  }, [notebookId]);

  // 4. Source Selection Handlers
  const handleToggleDoc = (docId) => {
    setSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    const readyDocIds = documents.filter(d => d.status === 'ready').map(d => d.id);
    if (selectedDocIds.length === readyDocIds.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(readyDocIds);
    }
  };

  // 5. Upload Handler
  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const res = await api.uploadDocument(notebookId, file);
      setDocuments(prev => [res.data, ...prev]);
      // Trigger polling
      setTimeout(() => pollDocuments(), 1500);
    } catch (err) {
      console.error('Upload failed:', err);
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // 6. Delete Document Handler
  const handleDeleteDocument = async (documentId) => {
    try {
      await api.deleteDocument(documentId);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      setSelectedDocIds(prev => prev.filter(id => id !== documentId));
    } catch (err) {
      console.error('Delete document failed:', err);
      alert(err.message || 'Failed to delete document');
    }
  };

  // 7. Reprocess Document Handler
  const handleReprocessDocument = async (documentId) => {
    try {
      await api.reprocessDocument(documentId);
      setDocuments(prev =>
        prev.map(d => (d.id === documentId ? { ...d, status: 'processing', errorMessage: null } : d))
      );
      setTimeout(() => pollDocuments(), 1500);
    } catch (err) {
      console.error('Reprocess document failed:', err);
      alert(err.message || 'Failed to reprocess document');
    }
  };

  // 8. Create New Conversation
  const handleCreateConversation = async () => {
    try {
      const count = conversations.length + 1;
      const res = await api.createConversation(notebookId, `Chat ${count}`);
      setConversations(prev => [res.data, ...prev]);
      setActiveConversationId(res.data.id);
    } catch (err) {
      console.error('Create conversation failed:', err);
    }
  };

  // 9. Send Chat Message
  const handleSendMessage = async (question) => {
    if (!activeConversationId || isSending) return;

    setChatError(null);
    setIsSending(true);

    // Optimistically append user message to UI
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      citations: [],
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.chat(notebookId, {
        conversationId: activeConversationId,
        question,
        documentIds: selectedDocIds.length > 0 ? selectedDocIds : null,
      });

      // Replace optimistic message with actual DB messages
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        res.data.userMessage,
        res.data.assistantMessage,
      ]);

      // Update conversation title if changed
      const updatedConvs = await api.getConversations(notebookId);
      setConversations(updatedConvs.data || []);
    } catch (err) {
      console.error('Chat error:', err);
      setChatError(err.message || 'Failed to generate answer. Check Gemini API key and backend logs.');
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  // 10. Open Document Viewer at specific page from citation click
  const handleCitationClick = (citation) => {
    setViewerState({
      isOpen: true,
      documentId: citation.documentId,
      documentName: citation.documentName,
      pageNumber: citation.pageNumber || 1,
    });
  };

  const handleOpenDocViewer = (doc) => {
    setViewerState({
      isOpen: true,
      documentId: doc.id,
      documentName: doc.fileName,
      pageNumber: 1,
    });
  };

  if (isLoadingNotebook) {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-sm font-medium">Loading research workspace...</p>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden transition-colors">
      <Navbar notebookTitle={notebook?.title} />

      {/* Main Workspace 3-Panel Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Panel: Sources */}
        <aside
          className={`${
            leftOpen ? 'w-80' : 'w-0'
          } shrink-0 transition-all duration-200 overflow-hidden hidden md:block relative z-10`}
        >
          <div className="w-80 h-full">
            <SourcesPanel
              documents={documents}
              selectedDocIds={selectedDocIds}
              onToggleDoc={handleToggleDoc}
              onSelectAll={handleSelectAll}
              onUpload={handleUpload}
              isUploading={isUploading}
              onDelete={handleDeleteDocument}
              onReprocess={handleReprocessDocument}
              onOpenViewer={handleOpenDocViewer}
              pollDocuments={pollDocuments}
            />
          </div>
        </aside>

        {/* Left Panel Toggle Button */}
        <button
          type="button"
          onClick={() => setLeftOpen(!leftOpen)}
          className="hidden md:flex absolute left-0 top-3 z-20 items-center justify-center w-6 h-8 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 border-l-0 rounded-r-md text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          style={{ left: leftOpen ? '320px' : '0px' }}
          title={leftOpen ? 'Collapse sources panel' : 'Expand sources panel'}
        >
          {leftOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
        </button>

        {/* Center Panel: Chat (Desktop & Mobile Chat view) */}
        <main className={`flex-1 h-full min-w-0 ${mobileTab === 'chat' ? 'block' : 'hidden md:block'}`}>
          <ChatPanel
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={setActiveConversationId}
            onCreateConversation={handleCreateConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isSending={isSending}
            onSendMessage={handleSendMessage}
            onCitationClick={handleCitationClick}
            suggestedQuestions={suggestedQuestions}
            selectedSourcesCount={selectedDocIds.length}
            totalSourcesCount={documents.length}
            chatError={chatError}
          />
        </main>

        {/* Mobile Alternate Views */}
        <div className={`flex-1 h-full md:hidden ${mobileTab === 'sources' ? 'block' : 'hidden'}`}>
          <SourcesPanel
            documents={documents}
            selectedDocIds={selectedDocIds}
            onToggleDoc={handleToggleDoc}
            onSelectAll={handleSelectAll}
            onUpload={handleUpload}
            isUploading={isUploading}
            onDelete={handleDeleteDocument}
            onReprocess={handleReprocessDocument}
            onOpenViewer={handleOpenDocViewer}
            pollDocuments={pollDocuments}
          />
        </div>

        <div className={`flex-1 h-full md:hidden ${mobileTab === 'studio' ? 'block' : 'hidden'}`}>
          <StudioPanel
            documents={documents}
            notebookId={notebookId}
          />
        </div>

        {/* Right Panel Toggle Button */}
        <button
          type="button"
          onClick={() => setRightOpen(!rightOpen)}
          className="hidden md:flex absolute right-0 top-3 z-20 items-center justify-center w-6 h-8 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 border-r-0 rounded-l-md text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          style={{ right: rightOpen ? '360px' : '0px' }}
          title={rightOpen ? 'Collapse studio panel' : 'Expand studio panel'}
        >
          {rightOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
        </button>

        {/* Right Panel: Studio */}
        <aside
          className={`${
            rightOpen ? 'w-[360px]' : 'w-0'
          } shrink-0 transition-all duration-200 overflow-hidden hidden md:block relative z-10`}
        >
          <div className="w-[360px] h-full">
            <StudioPanel
              documents={documents}
              notebookId={notebookId}
            />
          </div>
        </aside>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('sources')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            mobileTab === 'sources' ? 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Sources</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            mobileTab === 'chat' ? 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('studio')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            mobileTab === 'studio' ? 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Studio</span>
        </button>
      </div>

      {/* PDF Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        documentId={viewerState.documentId}
        documentName={viewerState.documentName}
        initialPage={viewerState.pageNumber}
      />
    </div>
  );
}
