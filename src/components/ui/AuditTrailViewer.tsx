import React from 'react';

interface AuditEntry {
  _id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: any;
  hash: string;
  previousHash?: string;
}

interface AuditTrailViewerProps {
  auditTrail: AuditEntry[];
  isVerified?: boolean;
}

export default function AuditTrailViewer({ auditTrail, isVerified }: AuditTrailViewerProps) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return '📝';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'payment_added': return '💰';
      case 'payment_modified': return '✏️';
      case 'payment_deleted': return '🗑️';
      case 'loan_modified': return '📋';
      case 'status_changed': return '🔄';
      case 'collaborator_added': return '👥';
      case 'amount_modified': return '💵';
      default: return '📌';
    }
  };

  const getActionLabel = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDetails = (details: any): string => {
    if (!details) return 'No details';
    
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'object' && !(value instanceof Date)) {
        return JSON.stringify(value, null, 2);
      }
      if (value instanceof Date) return new Date(value).toLocaleString();
      return String(value);
    };

    return Object.entries(details)
      .map(([key, value]) => {
        const label = key.split(/(?=[A-Z])/).join(' ').toLowerCase();
        return `${label}: ${formatValue(value)}`;
      })
      .join('\n');
  };

  if (!auditTrail || auditTrail.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No audit trail available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Audit Trail</h3>
        {isVerified !== undefined && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isVerified 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {isVerified ? '✓ Verified' : '⚠ Integrity Check Failed'}
          </span>
        )}
      </div>

      <div className="relative border-l-2 border-gray-300 pl-6 space-y-4">
        {auditTrail.map((entry, index) => {
          const isExpanded = expanded === entry._id;
          const timestamp = new Date(entry.timestamp);
          
          return (
            <div key={entry._id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[1.6rem] top-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                {getActionIcon(entry.action)}
              </div>

              {/* Entry card */}
              <div 
                className="bg-white border border-gray-200 rounded-lg p-4 shadow hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : entry._id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {getActionLabel(entry.action)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      by {entry.userName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {timestamp.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                {entry.details?.message && (
                  <p className="text-sm text-gray-700 mb-2">
                    {entry.details.message}
                  </p>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {formatDetails(entry.details)}
                    </pre>
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-xs text-gray-600 font-mono break-all">
                        <strong>Hash:</strong> {entry.hash.substring(0, 16)}...
                      </p>
                      {entry.previousHash && (
                        <p className="text-xs text-gray-600 font-mono break-all">
                          <strong>Previous:</strong> {entry.previousHash.substring(0, 16)}...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Expand indicator */}
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-400">
                    {isExpanded ? '▲ Click to collapse' : '▼ Click for details'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-gray-700">
          <strong>🔒 Blockchain-like Security:</strong> Each entry is cryptographically 
          linked to the previous one, making the history tamper-evident. Any attempt to 
          modify past entries will break the chain and be detected.
        </p>
      </div>
    </div>
  );
}
