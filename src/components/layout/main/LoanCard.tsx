'use client';

import { useState, useRef } from 'react';
import { getAuthHeader } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/Button';

interface LoanCardProps {
  loan: any;
  onUpdate: () => void;
  onOptimisticLoanUpdate?: (updated: any) => void;
  currentUserId: string;
  addToast: (toast: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function LoanCard({ loan, onUpdate, onOptimisticLoanUpdate, currentUserId, addToast }: LoanCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showLoanAdditions, setShowLoanAdditions] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [addLoanAmount, setAddLoanAmount] = useState('');
  const [addLoanDescription, setAddLoanDescription] = useState('');
  const [addLoanDate, setAddLoanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);
  const [editingAddition, setEditingAddition] = useState<any | null>(null);
  const [editAdditionAmount, setEditAdditionAmount] = useState('');
  const [editAdditionDescription, setEditAdditionDescription] = useState('');
  const [deletingAddition, setDeletingAddition] = useState<string | null>(null);
  const [approvingChange, setApprovingChange] = useState<string | null>(null);
  const [rejectingChange, setRejectingChange] = useState<string | null>(null);
  const [editLoanAmount, setEditLoanAmount] = useState('');
  const [editLoanDescription, setEditLoanDescription] = useState('');
  const [editLoanCounterpartyName, setEditLoanCounterpartyName] = useState('');
  const [editLoanCounterpartyEmail, setEditLoanCounterpartyEmail] = useState('');
  const [editLoanDueDate, setEditLoanDueDate] = useState('');
  const editModalOpenRef = useRef(false);
  const editFormDirtyRef = useRef(false);

  const loanCurrency = loan.currency || 'PKR';
  const getTodayIso = () => new Date().toISOString().split('T')[0];

  const toNumber = (value: any) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resetEditLoanState = () => {
    setEditLoanDescription('');
    setEditLoanCounterpartyName('');
    setEditLoanCounterpartyEmail('');
    setEditLoanAmount('');
    setEditLoanDueDate('');
    editFormDirtyRef.current = false;
  };

  const handleApprovePendingChange = async (changeId: string) => {
    setApprovingChange(changeId);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/pending-changes/${changeId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });

      if (res.ok) {
        addToast({ type: 'success', title: 'Change Approved', description: 'The pending change has been approved.' });
        onUpdate();
      } else {
        const error = await res.json();
        addToast({ type: 'error', title: 'Approval Failed', description: error.message || 'Failed to approve change' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred while approving the change.' });
    } finally {
      setApprovingChange(null);
    }
  };

  const handleRejectPendingChange = async (changeId: string) => {
    setRejectingChange(changeId);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/pending-changes/${changeId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });

      if (res.ok) {
        addToast({ type: 'success', title: 'Change Rejected', description: 'The pending change has been rejected.' });
        onUpdate();
      } else {
        const error = await res.json();
        addToast({ type: 'error', title: 'Rejection Failed', description: error.message || 'Failed to reject change' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred while rejecting the change.' });
    } finally {
      setRejectingChange(null);
    }
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', description: 'Please enter a valid amount' });
      return;
    }
    if (amt > loan.remainingAmount) {
      addToast({ type: 'error', title: 'Invalid Amount', description: 'Amount exceeds remaining balance' });
      return;
    }

    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'addPayment',
          amount: amt,
          date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
          description: paymentDescription || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const isSubmittedForApproval = json.message?.includes('approval');

        if (isSubmittedForApproval) {
          addToast({ type: 'info', title: 'Payment Submitted', description: 'Your payment has been submitted for approval.' });
        } else {
          addToast({ type: 'success', title: 'Payment Added', description: 'Payment has been added successfully.' });
        }

  const updatedLoan = json.data?.loan;
  if (updatedLoan && onOptimisticLoanUpdate && !isSubmittedForApproval) onOptimisticLoanUpdate(updatedLoan);
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentDescription('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: 'Failed to add payment' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const openEditAddition = (addition: any) => {
    setEditingAddition(addition);
    setEditAdditionAmount(String(addition.amount));
    setEditAdditionDescription(addition.description || '');
  };

  const submitEditAddition = async () => {
    if (!editingAddition) return;
    const newAmt = parseFloat(editAdditionAmount);
    if (isNaN(newAmt) || newAmt <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', description: 'Please enter a valid amount' });
      return;
    }
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/add-amount/${editingAddition._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ amount: newAmt, description: editAdditionDescription || undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        const updatedLoan = json.data;
        if (updatedLoan && onOptimisticLoanUpdate) onOptimisticLoanUpdate(updatedLoan);
        setEditingAddition(null);
        addToast({ type: 'success', title: 'Updated', description: 'Addition updated successfully' });
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: 'Failed to update addition' });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred while updating' });
    } finally {
      setProcessing(false);
    }
  };

  const confirmDeleteAddition = (addition: any) => {
    setDeletingAddition(addition._id);
  };

  const executeDeleteAddition = async () => {
    if (!deletingAddition) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/add-amount/${deletingAddition}`, { method: 'DELETE', headers: authHeaders });
      const json = await res.json();
      const isSubmittedForApproval = res.status === 201 || json.message?.toLowerCase()?.includes('approval') || json.data?.type === 'addition_deletion';
      if (res.ok) {
        const updatedLoan = json.data;
        if (!isSubmittedForApproval && updatedLoan && onOptimisticLoanUpdate) onOptimisticLoanUpdate(updatedLoan);
        addToast({
          type: isSubmittedForApproval ? 'info' : 'success',
          title: isSubmittedForApproval ? 'Deletion Submitted' : 'Deleted',
          description: isSubmittedForApproval ? 'Addition deletion has been submitted for approval.' : 'Addition deleted successfully',
        });
        setDeletingAddition(null);
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: json.message || 'Failed to delete addition' });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred while deleting' });
    } finally {
      setProcessing(false);
    }
  };

  const closeAddLoanModal = () => {
    setShowAddLoanModal(false);
    setAddLoanAmount('');
    setAddLoanDescription('');
    setAddLoanDate(getTodayIso());
  };

  const openAddLoanModal = () => {
    setAddLoanAmount('');
    setAddLoanDescription('');
    setAddLoanDate(getTodayIso());
    setShowAddLoanModal(true);
    setShowMenu(false);
  };

  const handleAddMoreLoan = async () => {
    const amt = parseFloat(addLoanAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', description: 'Please enter a valid amount' });
      return;
    }

    const additionDate = addLoanDate ? new Date(addLoanDate) : new Date();
    if (Number.isNaN(additionDate.getTime())) {
      addToast({ type: 'error', title: 'Invalid Date', description: 'Please select a valid date for the added loan amount' });
      return;
    }

    const additionDateIso = additionDate.toISOString();

    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/add-amount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          amount: amt,
          description: addLoanDescription || undefined,
          date: additionDateIso,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const isSubmittedForApproval = json.message?.includes('approval');

        addToast({
          type: isSubmittedForApproval ? 'info' : 'success',
          title: isSubmittedForApproval ? 'Addition Submitted' : 'Loan Added',
          description: isSubmittedForApproval ? 'Your loan addition has been submitted for approval.' : 'Loan amount has been added successfully.',
        });

        const updatedLoan = json.data;
        if (!updatedLoan.loanAdditions && !isSubmittedForApproval) {
          const newAddition = {
            _id: 'temp-' + Date.now(),
            amount: amt,
            date: additionDateIso,
            description: addLoanDescription || undefined,
            addedBy: 'you',
            addedByName: 'You',
          };
          updatedLoan.loanAdditions = [...(loan.loanAdditions || []), newAddition];
        }
        if (onOptimisticLoanUpdate && !isSubmittedForApproval) onOptimisticLoanUpdate(updatedLoan);
        closeAddLoanModal();
        onUpdate();
      } else {
        const errorData = await res.json();
        addToast({ type: 'error', title: 'Failed', description: errorData.message || 'Failed to add loan amount' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseLoan = async () => {
    if (!confirm('Mark as fully paid?')) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (res.ok) {
        setShowMenu(false);
        addToast({ type: 'success', title: 'Updated', description: 'Loan marked as fully paid' });
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: 'Failed to update loan status' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this loan?')) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Deleted', description: 'Loan deleted successfully' });
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: 'Failed to delete loan' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const populateEditFormFromLoan = (source: any) => {
    const additionsTotal = Array.isArray(source?.loanAdditions)
      ? source.loanAdditions.reduce((sum: number, addition: any) => sum + toNumber(addition?.amount), 0)
      : 0;

    const originalFromSource = source?.originalAmount ?? source?.baseOriginalAmount;
    const derivedOriginal = (() => {
      const totalAmount = toNumber(source?.amount);
      if (totalAmount > 0 && additionsTotal <= totalAmount) {
        const candidate = totalAmount - additionsTotal;
        if (candidate > 0) return candidate;
      }
      const remaining = toNumber(source?.remainingAmount);
      if (remaining > 0) return remaining;
      return totalAmount;
    })();

    const initialPrincipal = originalFromSource !== undefined && originalFromSource !== null
      ? toNumber(originalFromSource)
      : toNumber(derivedOriginal);

    const counterpartyFromSource = source?.counterparty && typeof source.counterparty === 'object'
      ? source.counterparty
      : undefined;

    const nameCandidates = [counterpartyFromSource?.name, source?.counterpartyName, source?.counterparty_name];
    const emailCandidates = [counterpartyFromSource?.email, source?.counterpartyEmail, source?.counterparty_email];
    const descriptionCandidate = source?.description ?? source?.details?.description ?? source?.metadata?.description ?? (source as any)?.description;

    const nameValue = (nameCandidates.find(value => typeof value === 'string' && value.trim().length > 0) || '').trim();
    const emailValue = (emailCandidates.find(value => typeof value === 'string' && value.trim().length > 0) || '').trim();
    const descriptionValue = typeof descriptionCandidate === 'string' ? descriptionCandidate : '';

    setEditLoanDescription(descriptionValue);
    setEditLoanCounterpartyName(nameValue);
    setEditLoanCounterpartyEmail(emailValue);
    setEditLoanAmount(Number.isFinite(initialPrincipal) && initialPrincipal >= 0 ? String(initialPrincipal) : '');
    setEditLoanDueDate(source?.dueDate ? new Date(source.dueDate).toISOString().split('T')[0] : '');
  };

  const hydrateLoanForEdit = async () => {
    try {
      if (!loan?._id) return;
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, { headers: { ...authHeaders }, cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const freshLoan = json?.data;
      if (!freshLoan) return;
  if (!editModalOpenRef.current || editFormDirtyRef.current) return; // Avoid overwriting user edits while typing
      populateEditFormFromLoan(freshLoan);
      if (onOptimisticLoanUpdate) onOptimisticLoanUpdate(freshLoan);
    } catch (error) {
      console.error('Failed to load loan for editing:', error);
    }
  };

  const openEditLoanModal = () => {
    editFormDirtyRef.current = false;
    editModalOpenRef.current = true;
    populateEditFormFromLoan(loan);
    setShowEditLoanModal(true);
    setShowMenu(false);
    void hydrateLoanForEdit();
  };

  const closeEditLoanModal = () => {
    editModalOpenRef.current = false;
    setShowEditLoanModal(false);
    resetEditLoanState();
  };

  const handleEditLoan = async () => {
    const parsedAmount = parseFloat(editLoanAmount);
    const trimmedCounterpartyName = editLoanCounterpartyName.trim();
    if (!trimmedCounterpartyName) {
      addToast({ type: 'error', title: 'Invalid', description: 'Counterparty name is required' });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      addToast({ type: 'error', title: 'Invalid', description: 'Loan amount must be greater than zero' });
      return;
    }

    setProcessing(true);
    try {
      const payload: Record<string, any> = {
        description: editLoanDescription,
        amount: parsedAmount,
        dueDate: editLoanDueDate || null,
      };

      if (loan.counterparty || trimmedCounterpartyName) {
        payload.counterparty = {
          ...(loan.counterparty || {}),
          name: trimmedCounterpartyName,
          email: editLoanCounterpartyEmail.trim() || undefined,
        };
      }

      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        const updatedLoan = json.data;
        if (updatedLoan && onOptimisticLoanUpdate) onOptimisticLoanUpdate(updatedLoan);
        closeEditLoanModal();
        addToast({ type: 'success', title: 'Updated', description: 'Loan updated successfully' });
        onUpdate();
      } else {
        const error = await res.json();
        addToast({ type: 'error', title: 'Failed', description: error.message || 'Failed to update loan' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const totalAdded = (loan.loanAdditions || []).reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const baseOriginal = loan.baseOriginalAmount || loan.originalAmount || (loan.amount - totalAdded) || 0;
  const effectivePrincipal = baseOriginal + totalAdded;
  const paidSoFar = effectivePrincipal - loan.remainingAmount;
  const progress = effectivePrincipal > 0 ? (paidSoFar / effectivePrincipal) * 100 : 0;
  const isLent = loan.direction === 'lent';

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 relative">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLent ? 'bg-blue-500' : 'bg-orange-500'}`} />

        <div className="pl-2">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className={`flex-shrink-0 w-9 h-9 min-[450px]:w-12 min-[450px]:h-12 rounded-lg flex items-center justify-center ${
              isLent ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
            }`}>
              <svg className="w-4 h-4 min-[450px]:w-6 min-[450px]:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>

            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate flex-1 min-w-0">
              {loan.counterparty?.name || 'Unknown'}
            </h4>

            <button onClick={() => setShowMenu(!showMenu)} className="cursor-pointer p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col min-[450px]:flex-row min-[450px]:gap-3">
            <div className="hidden min-[450px]:block min-[450px]:w-12 flex-shrink-0"></div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isLent ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                  }`}
                >
                  {isLent ? 'Lent' : 'Borrowed'}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    loan.status === 'active'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  }`}
                >
                  {loan.status === 'active' ? 'Active' : 'Paid'}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{new Date(loan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="sm:hidden">{new Date(loan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </span>
              </div>

              {loan.description && (
                <div className="mb-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">Description:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{loan.description}</p>
                </div>
              )}

              {loan.status === 'active' && effectivePrincipal > 0 && paidSoFar > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <span>{progress.toFixed(0)}% Repaid</span>
                    <span className="tabular-nums text-xs">
                      {loanCurrency} {paidSoFar.toFixed(2)} / {effectivePrincipal.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${isLent ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {loan.pendingChanges && loan.pendingChanges.length > 0 && loan.pendingChanges.some((c: any) => c.status === 'pending') && (
                <div className="mb-3 space-y-2">
                  {loan.pendingChanges
                    .filter((change: any) => change.status === 'pending')
                    .map((change: any) => {
                      const isOwnChange = change.requestedBy === currentUserId;
                      const changeTypeLabelMap: Record<string, string> = {
                        payment: 'Payment',
                        loan_addition: 'Loan Addition',
                        payment_deletion: 'Payment Deletion',
                        addition_deletion: 'Addition Deletion',
                        loan_deletion: 'Loan Deletion',
                      };
                      const changeTypeLabel = changeTypeLabelMap[change.type] || 'Change';

                      return (
                        <div key={change._id} className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
                                  ⏳ Pending {changeTypeLabel}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">{change.requestedByName}</span> wants to {change.action}
                                {change.type === 'payment' && ` a payment of ${loanCurrency} ${change.data?.amount?.toFixed(2)}`}
                                {change.type === 'loan_addition' && ` ${loanCurrency} ${change.data?.amount?.toFixed(2)} to the loan`}
                              </p>
                              {change.data?.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">"{change.data.notes}"</p>}
                            </div>
                          </div>

                          {!isOwnChange && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleApprovePendingChange(change._id)}
                                disabled={approvingChange === change._id}
                                className="cursor-pointer flex-1 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {approvingChange === change._id ? 'Approving...' : '✓ Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectPendingChange(change._id)}
                                disabled={rejectingChange === change._id}
                                className="cursor-pointer flex-1 px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {rejectingChange === change._id ? 'Rejecting...' : '✗ Reject'}
                              </button>
                            </div>
                          )}

                          {isOwnChange && <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-2">Waiting for approval from the other party</p>}
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 mb-2 space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">Remaining Amount</p>
                <p className={`text-lg sm:text-xl font-bold tabular-nums ${isLent ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {loanCurrency} {loan.remainingAmount?.toFixed(2)}
                </p>
                {totalAdded > 0 && (
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">
                    Added so far: +{loanCurrency} {totalAdded.toFixed(2)} (Original: {loanCurrency} {(loan.amount - totalAdded).toFixed(2)})
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end flex-wrap">
                {loan.payments?.length > 0 && (
                  <span onClick={() => setShowPayments(!showPayments)} className="cursor-pointer px-2 py-1.5 text-[11px] sm:text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {loan.payments.length} Payment{loan.payments.length !== 1 ? 's' : ''}
                  </span>
                )}
                {loan.loanAdditions?.length > 0 && (
                  <span onClick={() => setShowLoanAdditions(!showLoanAdditions)} className="cursor-pointer px-2 py-1.5 text-[11px] sm:text-xs font-medium bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-md flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {loan.loanAdditions.length} Addition{loan.loanAdditions.length !== 1 ? 's' : ''}
                  </span>
                )}
                {/* Audit trail removed */}
              </div>
            </div>
          </div>

          {showPayments && loan.payments?.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
              <div className="flex flex-col min-[450px]:flex-row min-[450px]:gap-3">
                <div className="hidden min-[450px]:block min-[450px]:w-12 flex-shrink-0"></div>

                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Payment History</p>
                  {loan.payments.map((payment: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1 tabular-nums">
                          {loanCurrency} {payment.amount?.toFixed(2)}
                        </p>
                        {payment.description && <p className="text-gray-500 dark:text-gray-400 truncate text-xs">{payment.description}</p>}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium text-xs whitespace-nowrap">
                        {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showLoanAdditions && loan.loanAdditions?.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
              <div className="flex flex-col min-[450px]:flex-row min-[450px]:gap-3">
                <div className="hidden min-[450px]:block min-[450px]:w-12 flex-shrink-0"></div>

                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">Additional Loan History</p>
                  {loan.loanAdditions.map((addition: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800 relative">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm text-purple-900 dark:text-purple-100 tabular-nums">
                            +{loanCurrency} {addition.amount?.toFixed(2)}
                          </p>
                          <span className="text-purple-600 dark:text-purple-400 font-medium text-[10px] whitespace-nowrap">
                            {new Date(addition.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {addition.description && <p className="text-purple-700 dark:text-purple-300 text-xs mb-0.5">{addition.description}</p>}
                        <p className="text-[10px] text-purple-500 dark:text-purple-400">Added by {addition.addedByName || addition.addedBy || 'Unknown'}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <button onClick={() => openEditAddition(addition)} className="cursor-pointer text-[10px] px-2 py-1 rounded bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-300 dark:hover:bg-purple-700">
                          Edit
                        </button>
                        <button onClick={() => confirmDeleteAddition(addition)} className="cursor-pointer text-[10px] px-2 py-1 rounded bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-700">
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit trail UI removed */}
        </div>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-3 top-14 sm:top-16 z-20 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
              <button onClick={openEditLoanModal} className="cursor-pointer w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Loan
              </button>
              {loan.status === 'active' && (
                <>
                  <button onClick={() => { setShowPaymentModal(true); setShowMenu(false); }} className="cursor-pointer w-full px-4 py-3 text-left text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Payment
                  </button>
                  <button onClick={openAddLoanModal} className="cursor-pointer w-full px-4 py-3 text-left text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Add More Loan
                  </button>
                  <button onClick={handleCloseLoan} disabled={processing} className="cursor-pointer w-full px-4 py-3 text-left text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark as Paid
                  </button>
                </>
              )}
              <button onClick={handleDelete} disabled={processing} className="cursor-pointer w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-lg shadow-xl max-h-[70vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Add Payment</h4>
              <button onClick={() => setShowPaymentModal(false)} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 sm:space-y-5 pb-6 sm:pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Amount</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Maximum: {loanCurrency} {loan.remainingAmount?.toFixed(2)}</p>
                <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-semibold text-lg sm:text-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="0.00" autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                <input type="text" value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="e.g., Partial payment" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Date</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)} fullWidth size="md">
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleAddPayment} loading={processing} fullWidth size="md">
                  Add Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddLoanModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-lg shadow-xl max-h-[70vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Add More Loan</h4>
              <button onClick={closeAddLoanModal} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 sm:space-y-5 pb-6 sm:pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Loan Amount</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">This will be added to the remaining balance</p>
                <input type="number" step="0.01" value={addLoanAmount} onChange={(e) => setAddLoanAmount(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-semibold text-lg sm:text-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all" placeholder="0.00" autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                <input type="text" value={addLoanDescription} onChange={(e) => setAddLoanDescription(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all" placeholder="e.g., Additional loan for expenses" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Loan Addition Date</label>
                <input type="date" value={addLoanDate} onChange={(e) => setAddLoanDate(e.target.value)} className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all" />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closeAddLoanModal} fullWidth size="md">
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleAddMoreLoan} loading={processing} fullWidth size="md">
                  Add Loan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAddition && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-lg shadow-xl max-h-[70vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Addition</h4>
              <button onClick={() => setEditingAddition(null)} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                <input type="number" step="0.01" value={editAdditionAmount} onChange={(e) => setEditAdditionAmount(e.target.value)} className="w-full px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-semibold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                <input type="text" value={editAdditionDescription} onChange={(e) => setEditAdditionDescription(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setEditingAddition(null)}>
                  Cancel
                </Button>
                <Button variant="primary" fullWidth loading={processing} onClick={submitEditAddition}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingAddition && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-t-2xl sm:rounded-lg shadow-xl">
            <div className="p-5 space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Addition?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">This will remove the added amount and adjust the remaining balance. Action is irreversible.</p>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setDeletingAddition(null)}>
                  Cancel
                </Button>
                <Button variant="danger" fullWidth loading={processing} onClick={executeDeleteAddition}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditLoanModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-lg shadow-xl max-h-[80vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Loan</h4>
              <button onClick={closeEditLoanModal} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original Loan Amount *</label>
                <input type="number" step="0.01" value={editLoanAmount} onChange={(e) => { editFormDirtyRef.current = true; setEditLoanAmount(e.target.value); }} onWheel={(e) => e.currentTarget.blur()} className="w-full px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-semibold text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={editLoanDescription} onChange={(e) => { editFormDirtyRef.current = true; setEditLoanDescription(e.target.value); }} rows={3} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none" placeholder="e.g., Loan for emergency expenses" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counterparty Name *</label>
                <input type="text" required value={editLoanCounterpartyName} onChange={(e) => { editFormDirtyRef.current = true; setEditLoanCounterpartyName(e.target.value); }} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Person or company name" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email (Optional)</label>
                <input type="email" value={editLoanCounterpartyEmail} onChange={(e) => { editFormDirtyRef.current = true; setEditLoanCounterpartyEmail(e.target.value); }} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="email@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date (Optional)</label>
                <input type="date" value={editLoanDueDate} onChange={(e) => { editFormDirtyRef.current = true; setEditLoanDueDate(e.target.value); }} className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Updating the original amount will keep existing payments and additions intact while refreshing the remaining balance.
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closeEditLoanModal} fullWidth size="md">
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleEditLoan} loading={processing} fullWidth size="md">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
