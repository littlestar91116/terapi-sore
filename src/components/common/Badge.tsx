import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/20',
    red: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/20',
    yellow: 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-600/20',
    blue: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-600/20',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-600/20',
    gray: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-medium rounded-md',
    md: 'px-2.5 py-1 text-sm font-medium rounded-lg',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
