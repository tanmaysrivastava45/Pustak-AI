import React from 'react';
import { cn } from '../../lib/utils.js';

export function Badge({
  children,
  variant = 'default',
  className,
  ...props
}) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    primary: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    processing: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    uploaded: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {variant === 'ready' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {variant === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
      {variant === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
      {variant === 'uploaded' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
      {children}
    </span>
  );
}
