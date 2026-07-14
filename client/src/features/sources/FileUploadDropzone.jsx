import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

export function FileUploadDropzone({ onUpload, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate MIME type and extension
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents are supported.');
      return;
    }

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25MB limit.');
      return;
    }

    setError(null);
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 ${
          isDragging
            ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30'
            : 'border-slate-250 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={isUploading}
        />

        <div className="p-2.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 mb-2 group-hover:scale-105 transition-transform">
          <UploadCloud className="w-5 h-5" />
        </div>

        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center">
          Click to upload or drag & drop PDF
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 text-center">
          PDF documents up to 25MB
        </p>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
