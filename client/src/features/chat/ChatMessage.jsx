import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, FileText, ChevronRight } from 'lucide-react';
import { CitationBadge } from '../../components/CitationBadge.jsx';

export function ChatMessage({ message, onCitationClick }) {
  const isAssistant = message.role === 'assistant';
  const citations = Array.isArray(message.citations) ? message.citations : [];

  // Map citations by sourceIndex for quick lookup
  const citationMap = {};
  citations.forEach(c => {
    if (c.sourceIndex) {
      citationMap[c.sourceIndex] = c;
    }
  });

  /**
   * Helper that replaces citation markers like [cite:1] in markdown text
   * with customized CitationBadge elements.
   */
  const renderFormattedContent = (content) => {
    // Regex splits text into plain segments and [cite:X] markers
    const parts = content.split(/(\[(?:cite:\s*)?\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[(?:cite:\s*)?(\d+)\]/i);
      if (match) {
        const sourceIndex = parseInt(match[1], 10);
        const citation = citationMap[sourceIndex];
        return (
          <CitationBadge
            key={`cite-${index}`}
            sourceIndex={sourceIndex}
            citation={citation}
            onClick={onCitationClick}
          />
        );
      }

      // Normal text passage: render with markdown
      return (
        <span key={`text-${index}`} className="inline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node, ...props }) => <span className="inline" {...props} />,
              code: ({ node, inline, ...props }) =>
                inline ? (
                  <code className="bg-slate-100 text-violet-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                ) : (
                  <pre className="block my-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto font-mono" {...props} />
                ),
            }}
          >
            {part}
          </ReactMarkdown>
        </span>
      );
    });
  };

  return (
    <div
      className={`flex gap-3 py-4 ${
        isAssistant ? 'bg-transparent' : 'justify-end'
      }`}
    >
      {isAssistant && (
        <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAssistant
            ? 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs'
            : 'bg-violet-600 text-white shadow-xs'
        }`}
      >
        <div className="prose-pustak">
          {isAssistant ? (
            <div className="whitespace-pre-wrap">{renderFormattedContent(message.content)}</div>
          ) : (
            <p className="whitespace-pre-wrap text-white font-normal">{message.content}</p>
          )}
        </div>

        {/* Structured Citations Footer (Sources Cited Cards) */}
        {isAssistant && citations.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Verified Sources ({citations.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {citations.map((c, i) => (
                <div
                  key={c.citationId || i}
                  onClick={() => onCitationClick && onCitationClick(c)}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-750 hover:border-violet-200 dark:hover:border-violet-600/50 cursor-pointer transition-all group"
                  title="Click to view in document"
                >
                  <span className="w-5 h-5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-semibold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {c.sourceIndex || i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-violet-700 dark:group-hover:text-violet-300">
                      {c.documentName}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Page {c.pageNumber}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
