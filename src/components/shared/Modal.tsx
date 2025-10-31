import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className={`bg-white dark:bg-gray-900 w-full ${widthClasses[maxWidth]} rounded-t-2xl sm:rounded-lg shadow-xl max-h-[70vh] sm:max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h4>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-5 pb-6 sm:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
