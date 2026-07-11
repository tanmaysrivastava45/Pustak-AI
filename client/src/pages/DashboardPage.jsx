import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Navbar } from '../components/Navbar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Clock,
  MoreVertical,
  Trash2,
  Edit2,
  ArrowRight,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { formatRelativeTime } from '../lib/utils.js';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notebooks, setNotebooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingNotebook, setEditingNotebook] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const [deletingNotebook, setDeletingNotebook] = useState(null);

  const fetchNotebooks = async () => {
    try {
      setIsLoading(true);
      const res = await api.getNotebooks();
      setNotebooks(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load notebooks:', err);
      // In demo mode without active backend or empty, fallback gracefully
      setError(err.message || 'Could not connect to backend API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.createNotebook(newTitle.trim());
      setIsCreateOpen(false);
      setNewTitle('');
      navigate(`/workspace/${res.data.id}`);
    } catch (err) {
      console.error('Create notebook error:', err);
      alert(err.message || 'Failed to create notebook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editingNotebook) return;

    setIsSubmitting(true);
    try {
      await api.updateNotebook(editingNotebook.id, editTitle.trim());
      setNotebooks(prev =>
        prev.map(nb => (nb.id === editingNotebook.id ? { ...nb, title: editTitle.trim() } : nb))
      );
      setEditingNotebook(null);
    } catch (err) {
      console.error('Update notebook error:', err);
      alert(err.message || 'Failed to rename notebook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingNotebook) return;

    setIsSubmitting(true);
    try {
      await api.deleteNotebook(deletingNotebook.id);
      setNotebooks(prev => prev.filter(nb => nb.id !== deletingNotebook.id));
      setDeletingNotebook(null);
    } catch (err) {
      console.error('Delete notebook error:', err);
      alert(err.message || 'Failed to delete notebook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotebooks = notebooks.filter(nb =>
    nb.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Research Notebooks</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select or create a notebook to organize your research papers and documents.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="shadow-sm shadow-violet-200 dark:shadow-none gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Notebook</span>
          </Button>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
            />
          </div>

          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            {filteredNotebooks.length} notebook{filteredNotebooks.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Notebooks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredNotebooks.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center mx-auto mb-4">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {searchQuery ? 'No matching notebooks' : 'No notebooks yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {searchQuery
                ? `No notebook found matching "${searchQuery}". Try a different search term.`
                : 'Create your first research notebook to upload PDFs and begin grounded question answering.'}
            </p>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Create Notebook</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotebooks.map(nb => (
              <Card
                key={nb.id}
                onClick={() => navigate(`/workspace/${nb.id}`)}
                className="group relative flex flex-col justify-between h-44 hover:border-violet-300 dark:hover:border-violet-600/70"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 group-hover:bg-violet-100 dark:group-hover:bg-violet-900 transition-colors">
                      <BookOpen className="w-4 h-4" />
                    </div>

                    {/* Actions menu */}
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotebook(nb);
                          setEditTitle(nb.title);
                        }}
                        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Rename notebook"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingNotebook(nb)}
                        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete notebook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                    {nb.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>
                      {nb.sourceCount} source{nb.sourceCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>{formatRelativeTime(nb.updatedAt)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Notebook Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Notebook"
        description="A notebook contains your uploaded source documents, conversation history, and synthesis notes."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <Input
            label="Notebook Title"
            placeholder="e.g., Quantum Computing Fundamentals"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!newTitle.trim()}>
              Create & Open
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Notebook Modal */}
      <Modal
        isOpen={Boolean(editingNotebook)}
        onClose={() => setEditingNotebook(null)}
        title="Rename Notebook"
      >
        <form onSubmit={handleUpdate} className="space-y-4 mt-2">
          <Input
            label="Notebook Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditingNotebook(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!editTitle.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingNotebook)}
        onClose={() => setDeletingNotebook(null)}
        title="Delete Notebook"
        description={`Are you sure you want to delete "${deletingNotebook?.title}"? All uploaded documents, embeddings, and conversation history will be permanently deleted.`}
      >
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeletingNotebook(null)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} isLoading={isSubmitting}>
            Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
