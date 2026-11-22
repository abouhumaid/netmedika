import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };
  return <Loader2 className={cn('animate-spin text-pharmacy-600', sizes[size], className)} />;
};

export const PageLoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading data...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center">
      <div className="p-4 bg-pharmacy-50 rounded-2xl mb-4 text-pharmacy-600 border border-pharmacy-100 shadow-sm animate-pulse">
        <LoadingSpinner size="lg" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="w-full animate-pulse divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-4 px-6">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-200/70 rounded-md"
              style={{ width: `${Math.max(40, (cIdx + 1) * 15)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-8 bg-slate-200 rounded w-36 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-28" />
    </div>
  );
};
