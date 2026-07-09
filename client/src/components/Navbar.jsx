import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { Button } from './ui/Button.jsx';
import { BookOpen, User, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';

export function Navbar({ notebookTitle }) {
  const { user, signOut, isDemoMode } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Researcher';

  return (
    <nav className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 transition-colors">
      {/* Brand logo & Notebook Title */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-base shadow-xs group-hover:bg-violet-700 transition-colors">
            P
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
            Pustak<span className="text-violet-600 dark:text-violet-400 font-extrabold ml-0.5">AI</span>
          </span>
        </Link>

        {isDemoMode && (
          <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            Demo Mode
          </span>
        )}

        {notebookTitle && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-400">/</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
              {notebookTitle}
            </span>
          </div>
        )}
      </div>

      {/* User Menu & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Night / Light Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title={`Switch to ${isDark ? 'Light' : 'Night'} Mode`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 transition-transform duration-200 hover:-rotate-12" />
          )}
        </button>

        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-semibold text-xs flex items-center justify-center">
                {displayName[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Notebooks</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
