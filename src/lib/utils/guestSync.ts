/**
 * Guest Data Sync Service
 * 
 * Handles syncing guest data to cloud when user signs up or logs in
 */

import { getAllGuestData, clearGuestData } from './guestStorage';
import { getAuthHeader } from '@/lib/firebase/auth';

export interface SyncResult {
  success: boolean;
  entriesSynced: number;
  loansSynced: number;
  errors: string[];
}

/**
 * Sync all guest data to user account
 */
export async function syncGuestDataToCloud(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    entriesSynced: 0,
    loansSynced: 0,
    errors: [],
  };

  try {
    const guestData = getAllGuestData();
    
    if (guestData.entries.length === 0 && guestData.loans.length === 0) {
      // No data to sync
      result.success = true;
      return result;
    }

    const authHeaders = await getAuthHeader();

    // Sync entries
    for (const entry of guestData.entries) {
      try {
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            type: entry.type,
            amount: entry.amount,
            currency: entry.currency,
            description: entry.description,
            category: entry.category,
            date: entry.date,
            tags: entry.tags,
          }),
        });

        if (response.ok) {
          result.entriesSynced++;
        } else {
          const error = await response.json();
          result.errors.push(`Entry sync failed: ${error.message || 'Unknown error'}`);
        }
      } catch (error) {
        result.errors.push(`Entry sync error: ${error}`);
      }
    }

    // Sync loans
    for (const loan of guestData.loans) {
      try {
        const response = await fetch('/api/loans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            amount: loan.amount,
            currency: loan.currency,
            description: loan.description,
            direction: loan.direction,
            counterparty: loan.counterparty.name,
            counterpartyEmail: loan.counterparty.email,
            dueDate: loan.dueDate,
            tags: loan.tags,
          }),
        });

        if (response.ok) {
          result.loansSynced++;
          
          // If loan has payments, sync them too
          if (loan.payments && loan.payments.length > 0) {
            const loanData = await response.json();
            const newLoanId = loanData.data._id;
            
            for (const payment of loan.payments) {
              try {
                await fetch(`/api/loans/${newLoanId}/payments`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                  },
                  body: JSON.stringify({
                    amount: payment.amount,
                    date: payment.date,
                    method: payment.method,
                    notes: payment.notes,
                  }),
                });
              } catch (paymentError) {
                result.errors.push(`Payment sync error: ${paymentError}`);
              }
            }
          }
        } else {
          const error = await response.json();
          result.errors.push(`Loan sync failed: ${error.message || 'Unknown error'}`);
        }
      } catch (error) {
        result.errors.push(`Loan sync error: ${error}`);
      }
    }

    // If all synced successfully, clear guest data
    if (result.errors.length === 0) {
      clearGuestData();
      result.success = true;
    } else {
      // Partial success - some items synced
      result.success = result.entriesSynced > 0 || result.loansSynced > 0;
    }

    return result;
  } catch (error) {
    result.errors.push(`Sync failed: ${error}`);
    return result;
  }
}

/**
 * Check if there's guest data that needs syncing
 */
export function hasGuestDataToSync(): boolean {
  const guestData = getAllGuestData();
  return guestData.entries.length > 0 || guestData.loans.length > 0;
}

/**
 * Get count of items to sync
 */
export function getGuestDataCount(): { entries: number; loans: number } {
  const guestData = getAllGuestData();
  return {
    entries: guestData.entries.length,
    loans: guestData.loans.length,
  };
}
