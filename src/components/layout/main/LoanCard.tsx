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
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentDescription, setEditPaymentDescription] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
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

  const handleEditPayment = async () => {
    if (!editingPayment) return;
    const amt = parseFloat(editPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid', description: 'Enter valid amount' });
      return;
    }
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'editPayment',
          paymentId: editingPayment._id,
          amount: amt,
          date: editPaymentDate,
          notes: editPaymentDescription,
        }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Updated', description: 'Payment updated' });
        setEditingPayment(null);
        setShowEditPaymentModal(false);
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: 'Failed to update' });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid', description: 'Enter valid amount' });
      return;
    }
    const selectedDate = paymentDate ? new Date(paymentDate) : new Date();
    if (Number.isNaN(selectedDate.getTime())) {
      addToast({ type: 'error', title: 'Invalid Date', description: 'Please select a valid payment date' });
      return;
    }
    if (Number.isFinite(Number(loan.remainingAmount)) && amt > Number(loan.remainingAmount)) {
      addToast({ type: 'error', title: 'Invalid', description: 'Payment cannot exceed the remaining balance' });
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
          date: selectedDate.toISOString(),
          notes: paymentDescription || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const updatedLoan = json?.data?.loan ?? json?.data;
        if (updatedLoan && onOptimisticLoanUpdate) onOptimisticLoanUpdate(updatedLoan);
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentDescription('');
        setPaymentDate(getTodayIso());
        addToast({ type: 'success', title: 'Added', description: 'Payment added successfully' });
        onUpdate();
      } else {
        const error = await res.json();
        addToast({ type: 'error', title: 'Failed', description: error.message || error.error || 'Failed to add payment' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred while adding the payment' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment?')) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ action: 'deletePayment', paymentId }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Deleted', description: 'Payment deleted' });
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: 'Failed to delete' });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const formatLoanCurrency = (value: any) => `${loanCurrency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatLoanDate = (value: any) => {
    if (!value) return 'No date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? 'No date'
      : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getItemDescription = (item: any) => (item?.description || item?.notes || '').trim();

  const getLoanSummaryModel = () => {
    const payments = Array.isArray(loan.payments) ? loan.payments : [];
    const additions = Array.isArray(loan.loanAdditions) ? loan.loanAdditions : [];
    const totalAdded = additions.reduce((sum: number, a: any) => sum + Number(a?.amount || 0), 0);
    const originalAmount = Number(loan.baseOriginalAmount ?? loan.originalAmount ?? Math.max(Number(loan.amount || 0) - totalAdded, 0));
    return {
      originalAmount,
      totalAmount: Number(loan.amount || 0),
      remainingAmount: Number(loan.remainingAmount || 0),
      originalDate: loan.date,
      originalDescription: (loan.description || '').trim(),
      additions,
      payments,
    };
  };

  // ─── FIXED: Copy text now clearly includes name at the top ───────────────────
  const buildLoanSummaryText = () => {
    const model = getLoanSummaryModel();
    const counterpartyName = loan?.counterparty?.name || loan?.counterpartyName || 'Unknown';
    const isLent = loan.direction === 'lent';
    const lines: string[] = [
      `📋 Loan Summary`,
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 Name: ${counterpartyName}`,
      `📌 Type: ${isLent ? 'Lent (you gave)' : 'Borrowed (you received)'}`,
      `📅 Date: ${formatLoanDate(model.originalDate)}`,
      ``,
      `💰 Original Amount: ${formatLoanCurrency(model.originalAmount)}`,
    ];

    if (model.originalDescription) {
      lines.push(`   Note: ${model.originalDescription}`);
    }

    if (model.additions.length > 0) {
      lines.push(``);
      lines.push(`➕ Additional Amounts:`);
      model.additions.forEach((a: any) => {
        lines.push(`   • ${formatLoanCurrency(a.amount)} — ${formatLoanDate(a.date || a.createdAt)}`);
        const desc = getItemDescription(a);
        if (desc) lines.push(`     Note: ${desc}`);
      });
      lines.push(`   Total Amount: ${formatLoanCurrency(model.totalAmount)}`);
    }

    lines.push(``);
    lines.push(`🧾 Payments Made:`);
    if (model.payments.length > 0) {
      model.payments.forEach((p: any) => {
        lines.push(`   • ${formatLoanCurrency(p.amount)} — ${formatLoanDate(p.date || p.createdAt)}`);
        const desc = getItemDescription(p);
        if (desc) lines.push(`     Note: ${desc}`);
      });
    } else {
      lines.push(`   None yet`);
    }

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏦 Remaining Balance: ${formatLoanCurrency(model.remainingAmount)}`);

    return lines.join('\n');
  };

  // ─── REDESIGNED: Premium fintech canvas image ────────────────────────────────
  const renderLoanSummaryImage = async () => {
    const model = getLoanSummaryModel();
    const counterpartyName = loan?.counterparty?.name || loan?.counterpartyName || 'Unknown';
    const isLent = loan.direction === 'lent';

    const CARD_W = 1200;
    const PADDING = 64;
    const INNER_W = CARD_W - PADDING * 2;

    // Calculate dynamic height
    const transactionRows = model.additions.length + model.payments.length;
    const CARD_H = 800 + transactionRows * 110;

    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d')!;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const roundRect = (x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, shadowColor?: string, shadowBlur?: number) => {
      if (shadowColor) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur ?? 20;
        ctx.shadowOffsetY = 6;
      }
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      // `fill` can be a color string or a CanvasGradient
      ctx.fillStyle = fill as any;
      ctx.fill();
      if (shadowColor) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
    };

    const text = (
      str: string,
      x: number,
      y: number,
      color: string,
      font: string,
      align: CanvasTextAlign = 'left',
      maxWidth?: number
    ) => {
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = align;
      if (maxWidth) {
        ctx.fillText(str, x, y, maxWidth);
      } else {
        ctx.fillText(str, x, y);
      }
      ctx.textAlign = 'left';
    };

    const divider = (y: number, alpha = 0.08) => {
      ctx.strokeStyle = `rgba(15,23,42,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(CARD_W - PADDING, y);
      ctx.stroke();
    };

    // ── Page background ──────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, '#f0f4ff');
    bg.addColorStop(1, '#e8f5f0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Subtle background circles for depth
    ctx.fillStyle = 'rgba(99,102,241,0.06)';
    ctx.beginPath(); ctx.arc(1100, 80, 220, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(16,185,129,0.05)';
    ctx.beginPath(); ctx.arc(100, CARD_H - 80, 180, 0, Math.PI * 2); ctx.fill();

    // ── Main card ────────────────────────────────────────────────────────────
    roundRect(32, 32, CARD_W - 64, CARD_H - 64, 32, '#ffffff', 'rgba(15,23,42,0.12)', 40);

    // ── Header gradient strip ────────────────────────────────────────────────
    const headerGrad = ctx.createLinearGradient(32, 32, CARD_W - 32, 32);
    if (isLent) {
      headerGrad.addColorStop(0, '#1e40af');
      headerGrad.addColorStop(1, '#0891b2');
    } else {
      headerGrad.addColorStop(0, '#7c3aed');
      headerGrad.addColorStop(1, '#db2777');
    }
    ctx.beginPath();
    ctx.moveTo(64, 32);
    ctx.arcTo(CARD_W - 32, 32, CARD_W - 32, 64, 32);
    ctx.lineTo(CARD_W - 32, 220);
    ctx.lineTo(32, 220);
    ctx.lineTo(32, 64);
    ctx.arcTo(32, 32, 64, 32, 32);
    ctx.closePath();
    ctx.fillStyle = headerGrad;
    ctx.fill();

    // Header shimmer
    const shimmer = ctx.createLinearGradient(32, 32, 32, 220);
    shimmer.addColorStop(0, 'rgba(255,255,255,0.12)');
    shimmer.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimmer;
    ctx.fill();

    // Header: badge
    roundRect(PADDING, 62, 160, 34, 17, 'rgba(255,255,255,0.18)');
    text('LOAN SUMMARY', PADDING + 14, 84, 'rgba(255,255,255,0.95)', '700 13px "SF Pro Display", system-ui, sans-serif');

    // Header: type badge (right)
    const typeBadgeX = CARD_W - PADDING - 140;
    roundRect(typeBadgeX, 62, 140, 34, 17, isLent ? 'rgba(96,165,250,0.3)' : 'rgba(248,113,113,0.3)');
    text(isLent ? '↑ LENT OUT' : '↓ BORROWED', typeBadgeX + 70, 84, 'rgba(255,255,255,0.95)', '700 13px "SF Pro Display", system-ui, sans-serif', 'center');

    // Header: name
    text(counterpartyName, PADDING, 148, '#ffffff', '800 52px "SF Pro Display", Georgia, serif', 'left', INNER_W - 60);

    // Header: date
    text(formatLoanDate(model.originalDate), PADDING, 192, 'rgba(255,255,255,0.65)', '500 18px "SF Pro Display", system-ui, sans-serif');

    // ── Stat cards ───────────────────────────────────────────────────────────
    let y = 248;
    const statCardW = (INNER_W - 32) / 3;
    const stats = [
      { label: 'Original', value: formatLoanCurrency(model.originalAmount), color: '#0f766e', bg: '#f0fdf9', accent: '#99f6e4' },
      { label: 'Total Loan', value: formatLoanCurrency(model.totalAmount), color: '#1d4ed8', bg: '#eff6ff', accent: '#bfdbfe' },
    ];

    stats.forEach((stat, i) => {
      const sx = PADDING + i * (statCardW + 16);
      roundRect(sx, y, statCardW, 130, 20, stat.bg, 'rgba(15,23,42,0.06)', 12);
      // accent dot
      ctx.fillStyle = stat.accent;
      ctx.beginPath(); ctx.arc(sx + 24, y + 32, 8, 0, Math.PI * 2); ctx.fill();
      text(stat.label.toUpperCase(), sx + 20, y + 62, '#64748b', '600 12px "SF Pro Display", system-ui, sans-serif');
      text(stat.value, sx + 20, y + 104, stat.color, '800 26px "SF Pro Display", system-ui, sans-serif', 'left', statCardW - 24);
    });

    y += 158;
    // Show original amount description and date (always render)
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(PADDING, y, INNER_W, 72, 12);
    ctx.fill();
    ctx.stroke();
    text('📝', PADDING + 20, y + 40, '#64748b', '18px sans-serif');
    const origDesc = model.originalDescription || 'No description provided';
    text(origDesc, PADDING + 52, y + 36, '#475569', '500 18px "SF Pro Display", system-ui, sans-serif', 'left', INNER_W - 80);
    // show original date on the next line
    text(formatLoanDate(model.originalDate), PADDING + 52, y + 60, '#64748b', '500 14px "SF Pro Display", system-ui, sans-serif');
    y += 90;

    // ── Transaction section helper ───────────────────────────────────────────
    const drawSection = (
      title: string,
      emoji: string,
      items: any[],
      accentColor: string,
      accentBg: string,
      valueColor: string,
      getDate: (item: any) => string
    ) => {
      if (items.length === 0) return y;

      // Section header
      text(emoji + '  ' + title, PADDING, y + 24, '#0f172a', '700 20px "SF Pro Display", system-ui, sans-serif');
      text(`${items.length} record${items.length !== 1 ? 's' : ''}`, CARD_W - PADDING, y + 24, '#94a3b8', '500 15px "SF Pro Display", system-ui, sans-serif', 'right');
      y += 44;

      items.forEach((item: any) => {
        roundRect(PADDING, y, INNER_W, 96, 16, '#f8fafc', 'rgba(15,23,42,0.04)', 8);

        // Left accent bar
        roundRect(PADDING, y, 4, 96, 2, accentColor);

        // Amount badge
        roundRect(PADDING + 24, y + 22, 220, 52, 12, accentBg);
        text(formatLoanCurrency(item.amount), PADDING + 134, y + 54, valueColor, '700 20px "SF Pro Display", system-ui, sans-serif', 'center', 200);

        // Description
        const desc = getItemDescription(item);
        text(
          desc || 'No description',
          PADDING + 264,
          y + 42,
          desc ? '#1e293b' : '#94a3b8',
          `${desc ? '600' : '400'} 18px "SF Pro Display", system-ui, sans-serif`,
          'left',
          INNER_W - 300
        );

        // Date
        text(
          getDate(item),
          PADDING + 264,
          y + 72,
          '#64748b',
          '500 15px "SF Pro Display", system-ui, sans-serif'
        );

        // Date badge on right
        const dateStr = getDate(item);
        const dateBadgeW = ctx.measureText(dateStr).width + 32;
        roundRect(CARD_W - PADDING - dateBadgeW - 20, y + 30, dateBadgeW, 36, 10, '#f1f5f9');
        text(dateStr, CARD_W - PADDING - dateBadgeW / 2 - 20, y + 53, '#475569', '500 14px "SF Pro Display", system-ui, sans-serif', 'center');

        y += 110;
      });

      return y;
    };

    divider(y);
    y += 24;

    if (model.additions.length > 0) {
      drawSection('Additional Amounts', '➕', model.additions, '#6366f1', '#eef2ff', '#4338ca', (a) => formatLoanDate(a.date || a.createdAt));
      divider(y);
      y += 24;
    }

    if (model.payments.length > 0) {
      drawSection('Payments Made', '💳', model.payments, '#10b981', '#ecfdf5', '#059669', (p) => formatLoanDate(p.date || p.createdAt));
    } else {
      roundRect(PADDING, y, INNER_W, 72, 16, '#f8fafc');
      text('💳  Payments Made', PADDING + 24, y + 28, '#94a3b8', '600 18px "SF Pro Display", system-ui, sans-serif');
      text('No payments recorded yet', PADDING + 24, y + 56, '#cbd5e1', '400 15px "SF Pro Display", system-ui, sans-serif');
      y += 90;
    }

    divider(y + 8);
    y += 28;

    // ── Final balance card ────────────────────────────────────────────────────
    // Draw the final "REMAINING BALANCE" card slightly above the current flow
    // so it pokes out of the main card boundary for a lifted effect.
    const balanceYOffset = 40; // pixels to lift the card upward
    const balanceY = y - balanceYOffset;

    const balanceGrad = ctx.createLinearGradient(PADDING, balanceY, CARD_W - PADDING, balanceY + 130);
    // Warm amber background to match the small 'Remaining' stat
    balanceGrad.addColorStop(0, '#fff7ed');
    balanceGrad.addColorStop(1, '#fffbeb');
    roundRect(PADDING, balanceY, INNER_W, 130, 24, balanceGrad, 'rgba(15,23,42,0.06)', 16);

    // Inner subtle overlay
    const balanceShimmer = ctx.createLinearGradient(PADDING, balanceY, PADDING, balanceY + 130);
    balanceShimmer.addColorStop(0, 'rgba(255,255,255,0.06)');
    balanceShimmer.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = balanceShimmer as any;
    ctx.beginPath();
    ctx.roundRect(PADDING, balanceY, INNER_W, 130, 24);
    ctx.fill();

    text('REMAINING BALANCE', PADDING + 36, balanceY + 42, '#92400e', '600 14px "SF Pro Display", system-ui, sans-serif');
    text(formatLoanCurrency(model.remainingAmount), PADDING + 36, balanceY + 96, '#b45309', '800 44px "SF Pro Display", Georgia, serif');

    // ── Footer ────────────────────────────────────────────────────────────────
    // Advance y so later content (footer) sits below the lifted card. Use balanceY
    // to keep spacing consistent with the visual offset.
    y = balanceY + 155;
    text(
      `Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      CARD_W / 2,
      y,
      '#94a3b8',
      '400 14px "SF Pro Display", system-ui, sans-serif',
      'center'
    );

    return canvas;
  };

  // ── Slug helper for filename ──────────────────────────────────────────────
  const getCounterpartySlug = () => {
    const name = loan?.counterparty?.name || loan?.counterpartyName || 'loan';
    return String(name).replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'loan';
  };

  const handleCopyLoanSummary = async () => {
    const summary = buildLoanSummaryText();
    try {
      await navigator.clipboard.writeText(summary);
      addToast({ type: 'info', title: 'Copied', description: 'Loan summary copied as text' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Copy Failed', description: 'Unable to copy the loan summary' });
    }
    setShowMenu(false);
  };

  const handleShareLoanImage = async () => {
    try {
      const canvas = await renderLoanSummaryImage();
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('No blob');
      const slug = getCounterpartySlug();
      const file = new File([blob], `loan-${slug}.png`, { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: 'Loan Summary', text: buildLoanSummaryText(), files: [file] });
        addToast({ type: 'success', title: 'Shared', description: 'Loan summary shared successfully' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loan-${slug}.png`;
      link.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'info', title: 'Downloaded', description: 'Image downloaded' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Failed', description: 'Unable to create image' });
    }
    setShowMenu(false);
  };

  const handleDownloadLoanImage = async () => {
    try {
      const canvas = await renderLoanSummaryImage();
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('No blob');
      const slug = getCounterpartySlug();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loan-${slug}.png`;
      link.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Downloaded', description: 'Loan summary image downloaded' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Download Failed', description: 'Unable to download image' });
    }
    setShowMenu(false);
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
        if (json.data && onOptimisticLoanUpdate) onOptimisticLoanUpdate(json.data);
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

  const confirmDeleteAddition = (addition: any) => setDeletingAddition(addition._id);

  const executeDeleteAddition = async () => {
    if (!deletingAddition) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/add-amount/${deletingAddition}`, { method: 'DELETE', headers: authHeaders });
      const json = await res.json();
      const isSubmittedForApproval = res.status === 201 || json.message?.toLowerCase()?.includes('approval') || json.data?.type === 'addition_deletion';
      if (res.ok) {
        if (!isSubmittedForApproval && json.data && onOptimisticLoanUpdate) onOptimisticLoanUpdate(json.data);
        addToast({
          type: isSubmittedForApproval ? 'info' : 'success',
          title: isSubmittedForApproval ? 'Deletion Submitted' : 'Deleted',
          description: isSubmittedForApproval ? 'Submitted for approval.' : 'Addition deleted successfully',
        });
        setDeletingAddition(null);
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed', description: json.message || 'Failed to delete addition' });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Error', description: 'An error occurred' });
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
      addToast({ type: 'error', title: 'Invalid Date', description: 'Please select a valid date' });
      return;
    }
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/add-amount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ amount: amt, description: addLoanDescription || undefined, date: additionDate.toISOString() }),
      });
      if (res.ok) {
        const json = await res.json();
        const isSubmittedForApproval = json.message?.includes('approval');
        addToast({
          type: isSubmittedForApproval ? 'info' : 'success',
          title: isSubmittedForApproval ? 'Addition Submitted' : 'Loan Added',
          description: isSubmittedForApproval ? 'Submitted for approval.' : 'Loan amount added successfully.',
        });
        const updatedLoan = json.data;
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
      const res = await fetch(`/api/loans/${loan._id}`, { method: 'DELETE', headers: authHeaders });
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
      ? source.loanAdditions.reduce((sum: number, a: any) => sum + toNumber(a?.amount), 0)
      : 0;
    const originalFromSource = source?.originalAmount ?? source?.baseOriginalAmount;
    const derivedOriginal = (() => {
      const total = toNumber(source?.amount);
      if (total > 0 && additionsTotal <= total) { const c = total - additionsTotal; if (c > 0) return c; }
      const rem = toNumber(source?.remainingAmount);
      if (rem > 0) return rem;
      return total;
    })();
    const initialPrincipal = originalFromSource !== undefined && originalFromSource !== null ? toNumber(originalFromSource) : toNumber(derivedOriginal);
    const counterpartyFromSource = source?.counterparty && typeof source.counterparty === 'object' ? source.counterparty : undefined;
    const nameCandidates = [counterpartyFromSource?.name, source?.counterpartyName, source?.counterparty_name];
    const emailCandidates = [counterpartyFromSource?.email, source?.counterpartyEmail, source?.counterparty_email];
    const descriptionCandidate = source?.description ?? source?.details?.description ?? '';
    const nameValue = (nameCandidates.find(v => typeof v === 'string' && v.trim().length > 0) || '').trim();
    const emailValue = (emailCandidates.find(v => typeof v === 'string' && v.trim().length > 0) || '').trim();
    setEditLoanDescription(typeof descriptionCandidate === 'string' ? descriptionCandidate : '');
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
      if (!editModalOpenRef.current || editFormDirtyRef.current) return;
      populateEditFormFromLoan(freshLoan);
      if (onOptimisticLoanUpdate) onOptimisticLoanUpdate(freshLoan);
    } catch (err) {
      console.error('Failed to load loan for editing:', err);
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
    const trimmedName = editLoanCounterpartyName.trim();
    if (!trimmedName) { addToast({ type: 'error', title: 'Invalid', description: 'Counterparty name is required' }); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { addToast({ type: 'error', title: 'Invalid', description: 'Loan amount must be greater than zero' }); return; }
    setProcessing(true);
    try {
      const payload: Record<string, any> = { description: editLoanDescription, amount: parsedAmount, dueDate: editLoanDueDate || null };
      if (loan.counterparty || trimmedName) {
        payload.counterparty = { ...(loan.counterparty || {}), name: trimmedName, email: editLoanCounterpartyEmail.trim() || undefined };
      }
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && onOptimisticLoanUpdate) onOptimisticLoanUpdate(json.data);
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

  // ─── Derived values ──────────────────────────────────────────────────────────
  const totalAdded = (loan.loanAdditions || []).reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const baseOriginal = loan.baseOriginalAmount || loan.originalAmount || (loan.amount - totalAdded) || 0;
  const effectivePrincipal = baseOriginal + totalAdded;
  const paidSoFar = effectivePrincipal - loan.remainingAmount;
  const progress = effectivePrincipal > 0 ? Math.min((paidSoFar / effectivePrincipal) * 100, 100) : 0;
  const isLent = loan.direction === 'lent';
  const isPaid = loan.status === 'paid';

  // ─── Shared modal input class ────────────────────────────────────────────────
  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500';

  return (
    <>
      {/* ─── REDESIGNED CARD ────────────────────────────────────────────────── */}
      <div className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

        {/* Left accent bar */}
        <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${isLent ? 'bg-gradient-to-b from-blue-400 to-cyan-500' : 'bg-gradient-to-b from-violet-500 to-pink-500'}`} />

        <div className="px-5 py-4 pl-6">

          {/* ── Top row: avatar + name + menu ─────────────────────────────── */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white ${isLent ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-violet-500 to-pink-500'}`}>
              {(loan.counterparty?.name || '?').charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate text-[15px] leading-tight">
                {loan.counterparty?.name || 'Unknown'}
              </h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(loan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>

          {/* ── Badges ────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${isLent ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'}`}>
              {isLent ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" /></svg>
              )}
              {isLent ? 'Lent' : 'Borrowed'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${isPaid ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isPaid ? 'Settled' : 'Active'}
            </span>
          </div>

          {/* ── Description ───────────────────────────────────────────────── */}
          {loan.description && (
            <div className="mb-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3.5 py-2.5 border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{loan.description}</p>
            </div>
          )}

          {/* ── Progress bar ──────────────────────────────────────────────── */}
          {!isPaid && effectivePrincipal > 0 && paidSoFar > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span className="font-medium">{progress.toFixed(0)}% repaid</span>
                <span className="tabular-nums">{loanCurrency} {paidSoFar.toFixed(2)} of {effectivePrincipal.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isLent ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-violet-500 to-pink-400'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Pending changes ────────────────────────────────────────────── */}
          {loan.pendingChanges?.some((c: any) => c.status === 'pending') && (
            <div className="mb-4 space-y-2">
              {loan.pendingChanges
                .filter((c: any) => c.status === 'pending')
                .map((change: any) => {
                  const isOwn = change.requestedBy === currentUserId;
                  const labelMap: Record<string, string> = {
                    payment: 'Payment', loan_addition: 'Loan Addition',
                    payment_deletion: 'Payment Deletion', addition_deletion: 'Addition Deletion', loan_deletion: 'Loan Deletion',
                  };
                  return (
                    <div key={change._id} className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/50 rounded-xl p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300">
                          ⏳ Pending {labelMap[change.type] || 'Change'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-semibold">{change.requestedByName}</span> wants to {change.action}
                        {change.type === 'payment' && ` a payment of ${loanCurrency} ${change.data?.amount?.toFixed(2)}`}
                        {change.type === 'loan_addition' && ` ${loanCurrency} ${change.data?.amount?.toFixed(2)} to the loan`}
                      </p>
                      {change.data?.notes && <p className="text-xs text-gray-500 italic">&quot;{change.data.notes}&quot;</p>}
                      {!isOwn && (
                        <div className="flex gap-2 mt-2.5">
                          <button
                            onClick={() => handleApprovePendingChange(change._id)}
                            disabled={approvingChange === change._id}
                            className="cursor-pointer flex-1 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {approvingChange === change._id ? 'Approving…' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectPendingChange(change._id)}
                            disabled={rejectingChange === change._id}
                            className="cursor-pointer flex-1 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {rejectingChange === change._id ? 'Rejecting…' : '✗ Reject'}
                          </button>
                        </div>
                      )}
                      {isOwn && <p className="text-xs text-gray-500 italic mt-2">Waiting for the other party to approve</p>}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ── Remaining amount block ─────────────────────────────────────── */}
          <div className={`rounded-xl p-4 mb-3 ${isPaid ? 'bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/30' : isLent ? 'bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30' : 'bg-violet-50 dark:bg-violet-900/15 border border-violet-100 dark:border-violet-800/30'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
              {isPaid ? 'Settled' : 'Remaining Balance'}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : isLent ? 'text-blue-600 dark:text-blue-400' : 'text-violet-600 dark:text-violet-400'}`}>
              {loanCurrency} {loan.remainingAmount?.toFixed(2)}
            </p>
            {totalAdded > 0 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                +{loanCurrency} {totalAdded.toFixed(2)} added · Original: {loanCurrency} {(loan.amount - totalAdded).toFixed(2)}
              </p>
            )}
          </div>

          {/* ── Toggle buttons (payments / additions) ─────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            {loan.payments?.length > 0 && (
              <button
                onClick={() => setShowPayments(!showPayments)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPayments ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {loan.payments.length} Payment{loan.payments.length !== 1 ? 's' : ''}
              </button>
            )}
            {loan.loanAdditions?.length > 0 && (
              <button
                onClick={() => setShowLoanAdditions(!showLoanAdditions)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showLoanAdditions ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {loan.loanAdditions.length} Addition{loan.loanAdditions.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* ── Payment history ────────────────────────────────────────────── */}
          {showPayments && loan.payments?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Payment History</p>
              {loan.payments.map((payment: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                  <div className="w-1.5 h-8 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white tabular-nums">{loanCurrency} {payment.amount?.toFixed(2)}</p>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {payment.notes && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{payment.notes}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => { setEditingPayment(payment); setEditPaymentAmount(String(payment.amount)); setEditPaymentDescription(payment.notes || ''); setEditPaymentDate(new Date(payment.date).toISOString().split('T')[0]); setShowEditPaymentModal(true); }}
                      className="cursor-pointer p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.5 2.5 0 113.536 3.536L7.5 21H4v-3.5L16.862 4.487z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDeletePayment(payment._id)}
                      className="cursor-pointer p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m3 0V4a1 1 0 011-1h6a1 1 0 011 1v3m-8 0h8" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Additions history ──────────────────────────────────────────── */}
          {showLoanAdditions && loan.loanAdditions?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500 mb-2">Additional Loan History</p>
              {loan.loanAdditions.map((addition: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-indigo-50/60 dark:bg-indigo-900/10 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/30">
                  <div className="w-1.5 h-8 rounded-full bg-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-300 tabular-nums">+{loanCurrency} {addition.amount?.toFixed(2)}</p>
                      <span className="text-xs text-indigo-400 whitespace-nowrap">{new Date(addition.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {addition.description && <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate mt-0.5">{addition.description}</p>}
                    <p className="text-[10px] text-indigo-400 mt-0.5">by {addition.addedByName || addition.addedBy || 'Unknown'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEditAddition(addition)} className="cursor-pointer p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.5 2.5 0 113.536 3.536L7.5 21H4v-3.5L16.862 4.487z" /></svg>
                    </button>
                    <button onClick={() => confirmDeleteAddition(addition)} className="cursor-pointer p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m3 0V4a1 1 0 011-1h6a1 1 0 011 1v3m-8 0h8" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Context menu ────────────────────────────────────────────────── */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-3 top-14 z-20 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">

              {/* Share section */}
              <div className="px-3 pt-3 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">Share Summary</p>
                {[
                  { label: 'Copy as Text', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, action: handleCopyLoanSummary },
                  { label: 'Share as Image', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l2.586-2.586a2 2 0 012.828 0L20 14m-4-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, action: handleShareLoanImage },
                  { label: 'Download Image', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>, action: handleDownloadLoanImage },
                ].map(({ label, icon, action }) => (
                  <button key={label} onClick={action} className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="text-gray-400">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 space-y-0.5">
                <button onClick={openEditLoanModal} className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Loan
                </button>
                {!isPaid && (
                  <>
                    <button onClick={() => { setShowPaymentModal(true); setShowMenu(false); }} className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Payment
                    </button>
                    <button onClick={openAddLoanModal} className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Add More Loan
                    </button>
                    <button onClick={handleCloseLoan} disabled={processing} className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Mark as Paid
                    </button>
                  </>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2">
                <button onClick={handleDelete} disabled={processing} className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete Loan
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Add Payment */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Add Payment</h4>
                <p className="text-xs text-gray-400 mt-0.5">Max: {loanCurrency} {loan.remainingAmount?.toFixed(2)}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Amount</label>
                <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} onWheel={e => e.currentTarget.blur()} className={inputCls} placeholder="0.00" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Note (Optional)</label>
                <input type="text" value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} className={inputCls} placeholder="e.g. Partial payment" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={`${inputCls} cursor-pointer`} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setShowPaymentModal(false)} fullWidth>Cancel</Button>
                <Button variant="primary" onClick={handleAddPayment} loading={processing} fullWidth>Add Payment</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment */}
      {showEditPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Edit Payment</h4>
              <button onClick={() => setShowEditPaymentModal(false)} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount</label>
                <input type="number" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note</label>
                <input type="text" value={editPaymentDescription} onChange={e => setEditPaymentDescription(e.target.value)} className={inputCls} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date</label>
                <input type="date" value={editPaymentDate} onChange={e => setEditPaymentDate(e.target.value)} className={`${inputCls} cursor-pointer`} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setShowEditPaymentModal(false)} fullWidth>Cancel</Button>
                <Button variant="primary" onClick={handleEditPayment} loading={processing} fullWidth>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add More Loan */}
      {showAddLoanModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Add More Loan</h4>
                <p className="text-xs text-gray-400 mt-0.5">Will be added to the remaining balance</p>
              </div>
              <button onClick={closeAddLoanModal} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount</label>
                <input type="number" step="0.01" value={addLoanAmount} onChange={e => setAddLoanAmount(e.target.value)} onWheel={e => e.currentTarget.blur()} className={inputCls} placeholder="0.00" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note (Optional)</label>
                <input type="text" value={addLoanDescription} onChange={e => setAddLoanDescription(e.target.value)} className={inputCls} placeholder="e.g. Additional funds" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date</label>
                <input type="date" value={addLoanDate} onChange={e => setAddLoanDate(e.target.value)} className={`${inputCls} cursor-pointer`} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={closeAddLoanModal} fullWidth>Cancel</Button>
                <Button variant="primary" onClick={handleAddMoreLoan} loading={processing} fullWidth>Add Loan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Addition */}
      {editingAddition && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Edit Addition</h4>
              <button onClick={() => setEditingAddition(null)} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount</label>
                <input type="number" step="0.01" value={editAdditionAmount} onChange={e => setEditAdditionAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description (Optional)</label>
                <input type="text" value={editAdditionDescription} onChange={e => setEditAdditionDescription(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setEditingAddition(null)} fullWidth>Cancel</Button>
                <Button variant="primary" onClick={submitEditAddition} loading={processing} fullWidth>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Addition confirmation */}
      {deletingAddition && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Delete Addition?</h4>
              <p className="text-sm text-gray-500 mt-1">This will remove the added amount and update the balance. This action is irreversible.</p>
            </div>
            <div className="p-5 flex gap-3">
              <Button variant="secondary" onClick={() => setDeletingAddition(null)} fullWidth>Cancel</Button>
              <Button variant="danger" onClick={executeDeleteAddition} loading={processing} fullWidth>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Loan */}
      {showEditLoanModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Edit Loan</h4>
              <button onClick={closeEditLoanModal} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4 pb-8">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Original Amount *</label>
                <input type="number" step="0.01" value={editLoanAmount} onChange={e => { editFormDirtyRef.current = true; setEditLoanAmount(e.target.value); }} onWheel={e => e.currentTarget.blur()} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</label>
                <textarea value={editLoanDescription} onChange={e => { editFormDirtyRef.current = true; setEditLoanDescription(e.target.value); }} rows={3} className={`${inputCls} resize-none`} placeholder="e.g. Loan for emergency expenses" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Counterparty Name *</label>
                <input type="text" value={editLoanCounterpartyName} onChange={e => { editFormDirtyRef.current = true; setEditLoanCounterpartyName(e.target.value); }} className={inputCls} placeholder="Person or company name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email (Optional)</label>
                <input type="email" value={editLoanCounterpartyEmail} onChange={e => { editFormDirtyRef.current = true; setEditLoanCounterpartyEmail(e.target.value); }} className={inputCls} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Due Date (Optional)</label>
                <input type="date" value={editLoanDueDate} onChange={e => { editFormDirtyRef.current = true; setEditLoanDueDate(e.target.value); }} className={`${inputCls} cursor-pointer`} />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">Updating the original amount keeps existing payments and additions intact while refreshing the remaining balance.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={closeEditLoanModal} fullWidth>Cancel</Button>
                <Button variant="primary" onClick={handleEditLoan} loading={processing} fullWidth>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}