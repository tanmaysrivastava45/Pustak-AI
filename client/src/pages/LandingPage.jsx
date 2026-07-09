import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  FileText,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Layers,
  ExternalLink,
} from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100/80 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300 text-xs font-semibold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>NotebookLM-Inspired AI Research Assistant</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white mb-6 leading-[1.15]">
          Your knowledge, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
            ready to talk.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Upload PDF documents, ask complex questions, and receive grounded answers with verifiable, clickable citations leading directly to the original source pages.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg" className="w-full sm:w-auto shadow-md shadow-violet-200 dark:shadow-none gap-2">
              <span>Start Researching Free</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Sign In to Your Workspace
            </Button>
          </Link>
        </div>

        {/* Realistic Interface Preview Card */}
        <div className="mt-14 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2.5 sm:p-4 text-left overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 ml-2">Pustak AI Workspace — Deep Learning Foundations</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ● 2 Sources Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
            {/* Mock Sources Column */}
            <div className="hidden md:block md:col-span-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Sources (2)</p>
              <div className="p-2 rounded bg-violet-50/60 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">Attention_Mechanism.pdf</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">12 pages • Ready</p>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">Transformer_Survey.pdf</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">18 pages • Ready</p>
                </div>
              </div>
            </div>

            {/* Mock Chat Column */}
            <div className="md:col-span-6 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="p-2.5 rounded-xl bg-violet-600 text-white text-xs ml-auto max-w-[85%]">
                How does multi-head attention improve representation learning?
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-slate-200 text-xs space-y-1.5 leading-relaxed">
                <p>
                  Multi-head attention enables the model to jointly attend to information from different representation subspaces at different positions <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 cursor-pointer">[1] p.4</span>.
                </p>
                <p>
                  With a single attention head, averaging inhibits this capability <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 cursor-pointer">[2] p.8</span>.
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-violet-700 dark:text-violet-400">Verified Sources:</span>
                  <span className="bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">Attention_Mechanism.pdf (p.4)</span>
                </div>
              </div>
            </div>

            {/* Mock Studio Column */}
            <div className="hidden md:block md:col-span-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Studio Key Takeaways</p>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-750 text-[11px] space-y-1 text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">• Parallel Processing</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Eliminates sequential recurrent bottlenecks during training.</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 pt-1">• Subspace Projection</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Queries, keys, and values are linearly projected $h$ times.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-white dark:bg-slate-900 py-20 border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Built for real academic and professional research
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              No hallucinated answers. No generic chatbot responses. Every claim is grounded in vector-retrieved evidence from your PDFs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-250 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Page-by-Page Ingestion</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                PDFs are parsed page-by-page and chunked with overlapping windows, preserving exact source page numbers and document IDs throughout the pipeline.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-250 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center mb-4">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Clickable Citations</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every citation pill in the AI's response is validated by the backend. Clicking a citation opens the built-in PDF viewer directly to the exact supporting page.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-250 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Research Studio</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Generate concise summaries, detailed breakdowns, high-impact key takeaways, and probing research questions with map-reduce batching for large documents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>© 2026 Pustak AI. Document-grounded AI research assistant.</p>
      </footer>
    </div>
  );
}
