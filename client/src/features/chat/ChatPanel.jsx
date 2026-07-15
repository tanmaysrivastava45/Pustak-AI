import React, { useRef, useEffect } from 'react';
import { MessageSquare, Plus, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ChatMessage } from './ChatMessage.jsx';
import { ChatInput } from './ChatInput.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function ChatPanel({
  conversations = [],
  activeConversation,
  onSelectConversation,
  onCreateConversation,
  messages = [],
  isLoadingMessages,
  isSending,
  onSendMessage,
  onCitationClick,
  suggestedQuestions = [],
  selectedSourcesCount = 0,
  totalSourcesCount = 0,
  chatError,
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const defaultStarterQuestions = [
    "What are the main findings or arguments presented in these documents?",
    "Can you provide an executive summary of the uploaded materials?",
    "What methodologies and evidence are used to support the conclusions?",
    "What are the key limitations or future directions discussed?",
  ];

  const starterQuestionsToDisplay = suggestedQuestions.length > 0
    ? suggestedQuestions
    : defaultStarterQuestions;

  return (
    <div className="h-full flex flex-col bg-slate-50/40 dark:bg-slate-950 select-text transition-colors">
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {activeConversation?.title || 'Chat Workspace'}
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Document-grounded question answering
            </p>
          </div>
        </div>

        {/* Conversation switcher & New Chat button */}
        <div className="flex items-center gap-2">
          {conversations.length > 1 && (
            <select
              value={activeConversation?.id || ''}
              onChange={(e) => onSelectConversation(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {conversations.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onCreateConversation}
            className="text-xs gap-1 h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <p className="text-xs">Loading conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State & Starter Questions */
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center mb-4 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Ask anything about your sources
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-md">
              Answers are synthesized exclusively from your uploaded documents and include verifiable citation badges linking to exact source pages.
            </p>

            {/* Starter Questions Grid */}
            <div className="w-full text-left space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                Suggested Starter Prompts
              </p>
              <div className="grid grid-cols-1 gap-2">
                {starterQuestionsToDisplay.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendMessage(q)}
                    disabled={isSending}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-600/70 hover:bg-violet-50/40 dark:hover:bg-slate-800/80 text-left text-xs text-slate-700 dark:text-slate-300 hover:text-violet-900 dark:hover:text-violet-200 transition-all shadow-2xs group flex items-center justify-between"
                  >
                    <span>{q}</span>
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Messages */
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
              />
            ))}

            {isSending && (
              <div className="flex gap-3 py-4">
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-300 shadow-2xs flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                  <span>Searching document chunks and formulating answer...</span>
                </div>
              </div>
            )}
          </>
        )}

        {chatError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{chatError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        onSend={onSendMessage}
        isLoading={isSending}
        selectedSourcesCount={selectedSourcesCount}
        totalSourcesCount={totalSourcesCount}
      />
    </div>
  );
}
