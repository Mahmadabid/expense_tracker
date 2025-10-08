import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// POST /api/loans/:id/add-amount - Add more loan amount to an existing loan
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Check if user has permission to add more loan
    // Only the loan owner or accepted collaborators can add more loan amount
    const canAddAmount = loan.userId === a.uid || 
                        loan.canUserEdit(a.uid);
    
    if (!canAddAmount) {
      return unauthorizedResponse('Not authorized to add loan amount');
    }

    const body = await request.json();
    const { amount, description } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return errorResponse('Amount must be positive');
    }

    // Get current decrypted data
    const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
    let decrypted: any = {};
    const loanAny = loan as any;
    
    if (loanAny.encryptedData) {
      try {
        decrypted = decryptObject(loanAny.encryptedData);
      } catch (err) {
        console.error('Failed to decrypt loan data:', err);
        return serverErrorResponse('Failed to process loan data');
      }
    }

    // Update amounts
  const currentAmount = decrypted.amount || 0;
  // originalAmount becomes the invariant initial principal; create baseOriginalAmount for backward compat
  const baseOriginal = decrypted.baseOriginalAmount || decrypted.originalAmount || currentAmount;
  const currentOriginalAmount = decrypted.originalAmount || baseOriginal;
  const currentRemainingAmount = decrypted.remainingAmount || currentAmount;
    
  // originalAmount should stay as the initial principal; total principal now = original + sum(additions)
  const newRemainingAmount = currentRemainingAmount + amount;
  const newAmount = currentAmount + amount; // reflects running principal for progress

    console.log('[ADD-AMOUNT] Current amounts:', { currentAmount, currentOriginalAmount, currentRemainingAmount });
    console.log('[ADD-AMOUNT] Adding amount:', amount);
  console.log('[ADD-AMOUNT] New amounts:', { newAmount, newRemainingAmount, originalAmount: currentOriginalAmount });

    // Create a loan addition entry (similar to payment structure)
    const mongoose = await import('mongoose');
    // Resolve user display name for audit
    let addedByName: string | undefined = undefined;
    try {
      const userDoc = await UserModel.findOne({ firebaseUid: a.uid });
      addedByName = userDoc?.displayName || 'User';
    } catch {}

    const loanAddition = {
      _id: new mongoose.default.Types.ObjectId(),
      amount: amount,
      date: new Date(),
      description: description || undefined,
      addedBy: a.uid,
      addedByName,
      version: 1,
      createdAt: new Date(),
    };

    // Add a comment to track the additional loan
    const addLoanComment = {
      _id: new mongoose.default.Types.ObjectId(),
      userId: a.uid,
      userName: addedByName || 'System',
      message: `Added +${loan.currency || 'PKR'} ${amount.toFixed(2)}${description ? ' (' + description + ')' : ''}`,
      createdAt: new Date(),
    };

    // Rebuild encrypted data with updated amounts
    const updatedSensitive = {
      amount: newAmount,
      // Preserve originalAmount as initial principal
      originalAmount: currentOriginalAmount,
      baseOriginalAmount: baseOriginal,
      remainingAmount: newRemainingAmount,
      description: decrypted.description || '',
      counterparty: decrypted.counterparty || null,
      payments: decrypted.payments || [],
      loanAdditions: [...(decrypted.loanAdditions || []), loanAddition],
      comments: [...(decrypted.comments || []), addLoanComment],
      category: decrypted.category || '',
      tags: decrypted.tags || [],
    };

    const newEncryptedData = encryptObject(updatedSensitive);

    // Update loan
    loanAny.encryptedData = newEncryptedData;
    loan.lastModifiedBy = a.uid;
    loan.version = (loan.version || 1) + 1;

    await loan.save();

    console.log('[ADD-AMOUNT] Loan saved successfully');

    // Fetch the updated loan to ensure we return fresh data with decryption
    const updatedLoan = await LoanModel.findById(params.id);
    
    return successResponse(updatedLoan, 'Loan amount added successfully', 200);
  } catch (error: any) {
    console.error('Add loan amount error:', error);
    return serverErrorResponse(error?.message || 'Failed to add loan amount');
  }
}
