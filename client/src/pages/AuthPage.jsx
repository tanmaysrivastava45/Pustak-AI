import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Mail, Lock, User, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword, isDemoMode } = useAuth();

  const isSignUp = pathname === '/signup';
  const isReset = pathname === '/reset-password';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isReset) {
        if (!email) throw new Error('Please enter your email address');
        await resetPassword(email);
        setSuccessMsg('Password reset link sent to your email.');
      } else if (isSignUp) {
        if (!email || !password) throw new Error('Email and password are required');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUp({ email, password, fullName });
        navigate('/dashboard');
      } else {
        if (!email || !password) throw new Error('Email and password are required');
        await signIn({ email, password });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:bg-violet-700 transition-colors">
            P
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100">
            Pustak<span className="text-violet-600 dark:text-violet-400 font-extrabold ml-0.5">AI</span>
          </span>
        </Link>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isReset
            ? 'Reset your password'
            : isSignUp
            ? 'Create your research account'
            : 'Sign in to Pustak AI'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isReset
            ? 'Enter your email to receive a password reset link'
            : isSignUp
            ? 'Start ingesting documents and asking grounded questions'
            : 'Welcome back! Enter your details to continue'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl shadow-slate-200/50 dark:shadow-none sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 transition-colors">
          {isDemoMode && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0">Demo Mode:</span>
              <span>
                Supabase credentials not yet configured in client/.env. You can enter any email/password to explore immediately!
              </span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                label="Full Name"
                type="text"
                icon={User}
                placeholder="Dr. Marie Curie"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="researcher@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!isReset && (
              <Input
                label="Password"
                type="password"
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}

            {!isReset && !isSignUp && (
              <div className="flex items-center justify-end">
                <Link
                  to="/reset-password"
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              {isReset
                ? 'Send Reset Link'
                : isSignUp
                ? 'Create Account'
                : 'Sign In'}
            </Button>
          </form>

          {/* Switch link */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            {isReset ? (
              <Link to="/login" className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>
            ) : isSignUp ? (
              <p>
                Already have an account?{' '}
                <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-semibold">
                  Sign in
                </Link>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-semibold">
                  Sign up free
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
