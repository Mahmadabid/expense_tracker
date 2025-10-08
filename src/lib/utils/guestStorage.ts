/**
 * Local Storage Service for Guest Mode
 * 
 * Provides offline storage for guest users using localStorage
 * Data structure matches API responses for easy migration
 */

import { Entry, Loan } from '@/types';

const STORAGE_KEYS = {
  ENTRIES: 'guest_entries',
  LOANS: 'guest_loans',
  PREFERENCES: 'guest_preferences',
  LAST_SYNC: 'guest_last_sync',
} as const;

export interface GuestData {
  entries: Entry[];
  loans: Loan[];
  preferences: {
    currency: string;
    theme: string;
  };
  lastModified: string;
}

/**
 * Generate a unique ID for guest entries
 */
function generateId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all guest entries from localStorage
 */
export function getGuestEntries(): Entry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading guest entries:', error);
    return [];
  }
}

/**
 * Save guest entries to localStorage
 */
export function saveGuestEntries(entries: Entry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Error saving guest entries:', error);
    throw new Error('Failed to save data locally. Storage may be full.');
  }
}

/**
 * Add a new entry for guest user
 */
export function addGuestEntry(entry: Omit<Entry, '_id' | 'createdAt' | 'updatedAt'>): Entry {
  const entries = getGuestEntries();
  const newEntry: Entry = {
    ...entry,
    _id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  entries.push(newEntry);
  saveGuestEntries(entries);
  return newEntry;
}

/**
 * Update an existing guest entry
 */
export function updateGuestEntry(id: string, updates: Partial<Entry>): Entry | null {
  const entries = getGuestEntries();
  const index = entries.findIndex(e => e._id === id);
  
  if (index === -1) return null;
  
  entries[index] = {
    ...entries[index],
    ...updates,
    updatedAt: new Date(),
    version: (entries[index].version || 1) + 1,
  };
  
  saveGuestEntries(entries);
  return entries[index];
}

/**
 * Delete a guest entry
 */
export function deleteGuestEntry(id: string): boolean {
  const entries = getGuestEntries();
  const filtered = entries.filter(e => e._id !== id);
  
  if (filtered.length === entries.length) return false;
  
  saveGuestEntries(filtered);
  return true;
}

/**
 * Get all guest loans from localStorage
 */
export function getGuestLoans(): Loan[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOANS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading guest loans:', error);
    return [];
  }
}

/**
 * Save guest loans to localStorage
 */
export function saveGuestLoans(loans: Loan[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Error saving guest loans:', error);
    throw new Error('Failed to save data locally. Storage may be full.');
  }
}

/**
 * Add a new loan for guest user
 */
export function addGuestLoan(loan: Omit<Loan, '_id' | 'createdAt' | 'updatedAt' | 'payments' | 'comments' | 'collaborators' | 'pendingApprovals' | 'auditTrail'>): Loan {
  const loans = getGuestLoans();
  const newLoan: Loan = {
    ...loan,
    _id: generateId(),
    payments: [],
    comments: [],
    collaborators: [],
    pendingApprovals: [],
    auditTrail: [{
      _id: generateId(),
      action: 'created',
      userId: loan.userId,
      userName: 'Guest User',
      timestamp: new Date(),
      details: {
        amount: loan.amount,
        currency: loan.currency,
        direction: loan.direction,
        counterparty: loan.counterparty?.name,
      },
      hash: generateId(), // Simple hash for guest mode
    }],
    loanStatus: 'accepted', // Guest loans don't need approval
    requiresMutualApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  loans.push(newLoan);
  saveGuestLoans(loans);
  return newLoan;
}

/**
 * Update a guest loan
 */
export function updateGuestLoan(id: string, updates: Partial<Loan>): Loan | null {
  const loans = getGuestLoans();
  const index = loans.findIndex(l => l._id === id);
  
  if (index === -1) return null;
  
  loans[index] = {
    ...loans[index],
    ...updates,
    updatedAt: new Date(),
    version: (loans[index].version || 1) + 1,
  };
  
  saveGuestLoans(loans);
  return loans[index];
}

/**
 * Add payment to guest loan
 */
export function addGuestLoanPayment(loanId: string, payment: {
  amount: number;
  date: Date;
  method?: string;
  notes?: string;
}): Loan | null {
  const loans = getGuestLoans();
  const index = loans.findIndex(l => l._id === loanId);
  
  if (index === -1) return null;
  
  const loan = loans[index];
  const newPayment = {
    _id: generateId(),
    ...payment,
    paidBy: loan.userId,
    createdAt: new Date(),
    version: 1,
  };
  
  loan.payments.push(newPayment);
  loan.remainingAmount = Math.max(0, loan.remainingAmount - payment.amount);
  
  if (loan.remainingAmount === 0) {
    loan.status = 'paid';
  }
  
  loan.updatedAt = new Date();
  loan.version = (loan.version || 1) + 1;
  
  saveGuestLoans(loans);
  return loan;
}

/**
 * Delete a guest loan
 */
export function deleteGuestLoan(id: string): boolean {
  const loans = getGuestLoans();
  const filtered = loans.filter(l => l._id !== id);
  
  if (filtered.length === loans.length) return false;
  
  saveGuestLoans(filtered);
  return true;
}

/**
 * Get all guest data for sync/export
 */
export function getAllGuestData(): GuestData {
  return {
    entries: getGuestEntries(),
    loans: getGuestLoans(),
    preferences: {
      currency: localStorage.getItem('currency') || 'PKR',
      theme: localStorage.getItem('theme') || 'light',
    },
    lastModified: localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString(),
  };
}

/**
 * Clear all guest data (after successful sync or on logout)
 */
export function clearGuestData(): void {
  localStorage.removeItem(STORAGE_KEYS.ENTRIES);
  localStorage.removeItem(STORAGE_KEYS.LOANS);
  localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
}

/**
 * Get dashboard summary for guest user
 */
export function getGuestDashboard() {
  const entries = getGuestEntries();
  const loans = getGuestLoans();
  
  const totalIncome = entries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalExpense = entries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalLoaned = loans
    .filter(l => l.direction === 'lent' && l.status === 'active')
    .reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  
  const totalBorrowed = loans
    .filter(l => l.direction === 'borrowed' && l.status === 'active')
    .reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  
  return {
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      totalLoaned,
      totalBorrowed,
      netLoan: totalLoaned - totalBorrowed,
    },
    entries: entries.slice(0, 10), // Recent 10
    loans: loans.slice(0, 10), // Recent 10
  };
}

/**
 * Check if localStorage is available and has space
 */
export function checkStorageAvailable(): { available: boolean; usage?: string } {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    
    // Estimate storage usage
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    const usageMB = (totalSize / 1024 / 1024).toFixed(2);
    
    return {
      available: true,
      usage: `${usageMB} MB used`,
    };
  } catch (e) {
    return {
      available: false,
    };
  }
}
