import React from 'react';

interface ExportData {
  entries?: any[];
  loans?: any[];
  summary?: any;
}

interface ExportButtonProps {
  data: ExportData;
}

export function ExportButton({ data }: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const exportToJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!data.entries || data.entries.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency'];
    const rows = data.entries.map((entry: any) => [
      new Date(entry.date).toLocaleDateString(),
      entry.type,
      entry.category || '',
      entry.description || '',
      entry.amount,
      entry.currency || 'PKR',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-tracker-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsExporting(!isExporting)}
        className="cursor-pointer inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Data
      </button>

      {isExporting && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsExporting(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => {
                exportToJSON();
                setIsExporting(false);
              }}
              className="cursor-pointer w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export as JSON
            </button>
            <button
              onClick={() => {
                exportToCSV();
                setIsExporting(false);
              }}
              className="cursor-pointer w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
