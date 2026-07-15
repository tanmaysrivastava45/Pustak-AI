import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Layers } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';

export function ChatInput({ onSend, isLoading, selectedSourcesCount = 0, totalSourcesCount = 0 }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sourceBadgeText = selectedSourcesCount > 0
    ? `${selectedSourcesCount} source${selectedSourcesCount === 1 ? '' : 's'} active`
    : totalSourcesCount > 0
    ? `All ${totalSourcesCount} sources active`
    : 'No sources uploaded yet';

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex flex-col rounded-2xl border border-slate-250 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800/60 focus-within:border-violet-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all shadow-xs">
          {/* Text input area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents... (Enter to send)"
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-44 disabled:opacity-60"
          />

          {/* Footer bar with active sources badge & send button */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 select-none">
              <Layers className="w-3.5 h-3.5 text-violet-500" />
              <span>{sourceBadgeText}</span>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
              isLoading={isLoading}
              className="rounded-xl px-3 h-8 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="text-xs">Send</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
