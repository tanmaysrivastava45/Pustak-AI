import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  List,
  HelpCircle,
  Layers,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { api } from '../../lib/api.js';

export function StudioPanel({
  documents = [],
  notebookId,
}) {
  const readyDocuments = documents.filter(d => d.status === 'ready');
  const [selectedDocId, setSelectedDocId] = useState(readyDocuments[0]?.id || '');
  const [activeTab, setActiveTab] = useState('concise'); // 'concise' | 'detailed' | 'key_takeaways' | 'suggested_questions'

  // Preserved content cache across tabs and documents:
  // Structure: { [docId]: { concise: '...', detailed: '...', key_takeaways: '...', suggested_questions: '...' } }
  const [contentCache, setContentCache] = useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState(null);

  // Auto-select first ready doc if none selected
  useEffect(() => {
    if (!selectedDocId && readyDocuments.length > 0) {
      setSelectedDocId(readyDocuments[0].id);
    }
  }, [readyDocuments, selectedDocId]);

  // When selected doc or active tab changes, check if we have cached content in memory or DB
  useEffect(() => {
    if (!selectedDocId) return;

    // 1. If already cached in component state, nothing more to fetch
    if (contentCache[selectedDocId]?.[activeTab]) {
      setError(null);
      return;
    }

    // 2. Otherwise check if Supabase DB already has cached summary for this tab
    let isCurrent = true;
    api.summarize(selectedDocId, { summaryType: activeTab, forceRefresh: false })
      .then(res => {
        if (!isCurrent) return;
        if (res.data?.content && res.data?.cached) {
          setContentCache(prev => ({
            ...prev,
            [selectedDocId]: {
              ...(prev[selectedDocId] || {}),
              [activeTab]: res.data.content,
            },
          }));
        }
      })
      .catch(() => {
        // Not yet generated in DB, user can click Generate
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedDocId, activeTab, contentCache]);

  const activeContent = contentCache[selectedDocId]?.[activeTab] || '';

  const handleGenerate = async (forceRefresh = false) => {
    if (!selectedDocId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.summarize(selectedDocId, {
        summaryType: activeTab,
        forceRefresh,
      });

      const newContent = res.data.content;
      setContentCache(prev => ({
        ...prev,
        [selectedDocId]: {
          ...(prev[selectedDocId] || {}),
          [activeTab]: newContent,
        },
      }));
    } catch (err) {
      console.error('Failed to generate studio summary:', err);
      setError(err.message || 'Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const tabs = [
    { id: 'concise', label: 'Concise', icon: BookOpen },
    { id: 'detailed', label: 'Detailed', icon: Layers },
    { id: 'key_takeaways', label: 'Takeaways', icon: List },
    { id: 'suggested_questions', label: 'Questions', icon: HelpCircle },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 select-text transition-colors">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Studio</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Summaries, insights & synthesis
            </p>
          </div>
        </div>
      </div>

      {/* Document Selector & Controls */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Target Document
          </label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            disabled={readyDocuments.length === 0 || isLoading}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 transition-colors"
          >
            {readyDocuments.length === 0 ? (
              <option value="">No ready documents</option>
            ) : (
              readyDocuments.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.fileName}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Studio Sub-Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasCachedContent = Boolean(contentCache[selectedDocId]?.[tab.id]);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                disabled={isLoading}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mb-0.5" />
                <span>{tab.label}</span>
                {/* Subtle indicator dot if content is already generated for this tab */}
                {hasCachedContent && !isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Generate / Refresh Button */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleGenerate(false)}
            disabled={!selectedDocId || isLoading}
            isLoading={isLoading}
            className="w-full text-xs h-8.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {activeContent
                ? `Regenerate ${tabs.find(t => t.id === activeTab)?.label}`
                : `Generate ${tabs.find(t => t.id === activeTab)?.label}`}
            </span>
          </Button>

          {activeContent && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleGenerate(true)}
              disabled={isLoading}
              title="Force Refresh Cache"
              className="h-8.5 w-8.5 shrink-0 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content Display Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <p className="text-xs">Analyzing document passages and synthesizing insights...</p>
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : activeContent ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {tabs.find(t => t.id === activeTab)?.label} Output
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-700 dark:text-slate-400 dark:hover:text-violet-300 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="prose-pustak text-xs leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeContent}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              No {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} generated yet
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
              Click Generate to synthesize {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} from this document. Content is saved across segments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
