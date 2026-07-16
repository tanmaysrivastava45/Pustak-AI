import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { api } from '../lib/api.js';
import { Button } from './ui/Button.jsx';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export function DocumentViewerModal({
  isOpen,
  onClose,
  documentId,
  initialPage = 1,
  documentName,
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Sync initialPage when prop updates
  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // Load PDF document
  useEffect(() => {
    if (!isOpen || !documentId) {
      setPdfDoc(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadPdf() {
      try {
        // Fetch signed URL or direct URL
        const { data } = await api.getDocumentViewUrl(documentId);
        if (!isMounted) return;

        const loadingTask = pdfjsLib.getDocument({
          url: data.signedUrl,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(Math.min(initialPage || 1, doc.numPages));
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load PDF in viewer:', err);
        setError(err.message || 'Failed to load PDF document');
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancel = false;

    async function renderPage() {
      try {
        // Cancel existing render if in progress
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        if (cancel) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    }

    renderPage();

    return () => {
      cancel = true;
    };
  }, [pdfDoc, currentPage, scale]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl z-10 overflow-hidden text-white">
        {/* Toolbar Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5 truncate max-w-md">
            <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                {documentName || 'Document Preview'}
              </h3>
              <p className="text-xs text-slate-400">
                {totalPages ? `${totalPages} pages` : 'Loading pages...'}
              </p>
            </div>
          </div>

          {/* Navigation & Zoom controls */}
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono text-slate-200">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                className="p-1 text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-mono text-slate-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                className="p-1 text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScale(1.2)}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-950/70">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 my-auto">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm">Loading document page {currentPage}...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center gap-3 text-rose-400 my-auto max-w-md text-center p-6 bg-slate-900 rounded-xl border border-rose-900/40">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs text-slate-400">
                Could not load PDF view from storage. Ensure the file exists and storage policies allow access.
              </p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`shadow-2xl rounded-sm transition-opacity duration-150 ${loading ? 'opacity-0' : 'opacity-100'}`}
          />
        </div>
      </div>
    </div>
  );
}
