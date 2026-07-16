import React, { useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';

export function CitationBadge({
  sourceIndex,
  citation,
  onClick,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!citation) {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 mx-0.5 align-baseline">
        [{sourceIndex}]
      </span>
    );
  }

  return (
    <span className="relative inline-block mx-0.5 align-baseline">
      <button
        type="button"
        onClick={() => onClick && onClick(citation)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-800 dark:bg-violet-950/80 dark:hover:bg-violet-900 dark:text-violet-300 dark:border-violet-800/60 transition-colors cursor-pointer border border-violet-200/60 shadow-2xs group"
        title={`Source ${sourceIndex}: ${citation.documentName}, Page ${citation.pageNumber}`}
      >
        <span>[{sourceIndex}]</span>
        <span className="text-[10px] text-violet-600 dark:text-violet-400 font-normal hidden sm:inline">p.{citation.pageNumber}</span>
      </button>

      {/* Popover Preview on Hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100 border border-slate-750">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
              <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="truncate">{citation.documentName}</span>
            </div>
            <span className="bg-violet-900/60 text-violet-300 font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0">
              Page {citation.pageNumber}
            </span>
          </div>
          <p className="text-slate-300 line-clamp-3 leading-relaxed italic">
            "{citation.excerpt}"
          </p>
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center gap-1 text-[10px] text-violet-400">
            <ExternalLink className="w-3 h-3" />
            <span>Click to navigate to page {citation.pageNumber}</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
}
