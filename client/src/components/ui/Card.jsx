import React from 'react';
import { cn } from '../../lib/utils.js';

export function Card({
  className,
  children,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200',
        'dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100',
        onClick && 'cursor-pointer hover:border-violet-300 dark:hover:border-violet-600/60 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
