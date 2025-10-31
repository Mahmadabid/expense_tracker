import React from 'react';
import { Loan } from '@/types';
import { useToast } from './Toaster';

interface PendingLoanCardProps {
  loan: Loan;
  onApprove: (loanId: string) => Promise<void>;
  onReject: (loanId: string, reason?: string) => Promise<void>;
  isCounterparty: boolean;
  currentUserId: string;
}

export default function PendingLoanCard({
  loan,
  onApprove,
  onReject,
  isCounterparty,
  currentUserId,
}: PendingLoanCardProps) {
  const { addToast } = useToast();
  const [isApproving, setIsApproving] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const handleApprove = async () => {
    if (!isCounterparty) return;
    
    setIsApproving(true);
    try {
      await onApprove(loan._id);
      addToast({ type: 'success', title: 'Loan Approved', description: 'You have successfully approved this loan.' });
    } catch (error) {
      console.error('Failed to approve loan:', error);
      addToast({ type: 'error', title: 'Approval Failed', description: 'Failed to approve loan. Please try again.' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!isCounterparty) return;
    
    setIsRejecting(true);
    try {
      await onReject(loan._id, rejectionReason.trim() || undefined);
      setShowRejectDialog(false);
      setRejectionReason('');
      addToast({ type: 'success', title: 'Loan Rejected', description: 'You have successfully rejected this loan request.' });
    } catch (error) {
      console.error('Failed to reject loan:', error);
      addToast({ type: 'error', title: 'Rejection Failed', description: 'Failed to reject loan. Please try again.' });
    } finally {
      setIsRejecting(false);
    }
  };

  const isPending = (loan as any).loanStatus === 'pending';
  const isRejected = (loan as any).loanStatus === 'rejected';
  const direction = loan.direction;
  
  // Determine the perspective message
  const getActionMessage = () => {
    if (!isCounterparty) {
      return isPending ? 'Waiting for counterparty approval' : 
             isRejected ? 'Loan was rejected by counterparty' : '';
    }
    
    if (direction === 'lent') {
      // Creator lent money, counterparty borrowed
      return `wants confirmation that you borrowed ${loan.currency} ${loan.amount}`;
    } else {
      // Creator borrowed money, counterparty lent
      return `wants confirmation that you lent ${loan.currency} ${loan.amount}`;
    }
  };

  const statusColor = isPending ? 'bg-yellow-100 border-yellow-300' : 'bg-red-100 border-red-300';
  const statusBadge = isPending ? 'Pending Approval' : 'Rejected';

  return (
    <div className={`border-2 ${statusColor} rounded-lg p-4 mb-3 shadow-md`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'
            }`}>
              {statusBadge}
            </span>
            <span className="text-sm text-gray-600">
              {new Date(loan.date).toLocaleDateString()}
            </span>
          </div>
          
          <div className="mb-2">
            <p className="text-lg font-bold text-gray-900">
              {loan.currency} {loan.amount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-700">
              {loan.counterparty?.name || 'Unknown'} {getActionMessage()}
            </p>
          </div>

          {loan.description && (
            <p className="text-sm text-gray-600 mt-2 italic">
              &quot;{loan.description}&quot;
            </p>
          )}

          {isRejected && (loan as any).rejectionReason && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                <strong>Reason:</strong> {(loan as any).rejectionReason}
              </p>
            </div>
          )}
        </div>
      </div>

      {isCounterparty && isPending && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-300">
          <button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {isApproving ? 'Approving...' : '✓ Accept'}
          </button>
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isApproving || isRejecting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      )}

      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Reject Loan Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this loan (optional):
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="E.g., Amount is incorrect, I don't recall this transaction..."
              className="w-full border border-gray-300 rounded p-2 mb-4 min-h-[100px]"
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                disabled={isRejecting}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
