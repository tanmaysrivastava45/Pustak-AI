import React, { useState, useEffect } from 'react';
import {
  FileText,
  Trash2,
  Eye,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { FileUploadDropzone } from './FileUploadDropzone.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { formatBytes } from '../../lib/utils.js';

export function SourcesPanel({
  documents = [],
  selectedDocIds = [],
  onToggleDoc,
  onSelectAll,
  onUpload,
  isUploading,
  onDelete,
  onReprocess,
  onOpenViewer,
  pollDocuments,
}) {
  const [docToDelete, setDocToDelete] = useState(null);

  // Poll for document status updates while any doc is processing or uploaded
  useEffect(() => {
    const hasPendingDocs = documents.some(
      d => d.status === 'processing' || d.status === 'uploaded'
    );

    if (!hasPendingDocs || !pollDocuments) return;

    const interval = setInterval(() => {
      pollDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, pollDocuments]);

  const allSelected = documents.length > 0 && selectedDocIds.length === documents.length;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none transition-colors">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sources</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {documents.length} document{documents.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {documents.length > 0 && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {/* Upload Dropzone */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <FileUploadDropzone onUpload={onUpload} isUploading={isUploading} />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {documents.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No sources uploaded</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Upload a research paper, book chapter, or notes PDF above to begin.
            </p>
          </div>
        ) : (
          documents.map(doc => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isReady = doc.status === 'ready';

            return (
              <div
                key={doc.id}
                className={`group relative rounded-xl border p-3 transition-all duration-150 ${
                  isSelected
                    ? 'border-violet-300 dark:border-violet-600/70 bg-violet-50/40 dark:bg-violet-950/20 shadow-2xs'
                    : 'border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleDoc(doc.id)}
                    disabled={!isReady}
                    className="mt-0.5 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Doc details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-violet-700 dark:hover:text-violet-400"
                        title={doc.fileName}
                        onClick={() => onOpenViewer(doc)}
                      >
                        {doc.fileName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={doc.status}>
                        {doc.status}
                      </Badge>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {doc.pageCount > 0 ? `${doc.pageCount} pgs • ` : ''}
                        {formatBytes(doc.fileSize)}
                      </span>
                    </div>

                    {doc.errorMessage && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 line-clamp-2">
                        {doc.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Hover Action Controls */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onOpenViewer(doc)}
                    className="p-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Preview PDF"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {doc.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => onReprocess(doc.id)}
                      className="p-1 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="Reprocess Document"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDocToDelete(doc)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
        description="Are you sure you want to delete this document? All associated chunks, embeddings, and summaries will be permanently removed."
      >
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDocToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (docToDelete) {
                onDelete(docToDelete.id);
                setDocToDelete(null);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
