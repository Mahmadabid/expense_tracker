import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    secondary: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  };

  const sizes = {
    sm: 'px-2.5 sm:px-3 py-1.5 text-xs',
    md: 'px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`
        inline-flex items-center justify-center gap-1.5 sm:gap-2 font-medium rounded-lg cursor-pointer
        transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}
      `}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="hidden sm:inline">Processing...</span>
          <span className="sm:hidden">...</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
