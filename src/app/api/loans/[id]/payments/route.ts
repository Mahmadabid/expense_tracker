import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';
import { decryptObject, encryptObject } from '@/lib/utils/encryption';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// POST /api/loans/:id/payments - Add payment to loan
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const { id } = await params;
    await connectDB();

    // Fetch only required fields to reduce payload
    const loan = await LoanModel.findById(id).select('userId encryptedData collaborators version lastModifiedBy direction status currency date tags createdBy pendingApprovals dueDate');
    if (!loan) return notFoundResponse('Loan not found');

    // Decrypt sensitive bundle
  const anyLoan: any = loan;
  const decrypted = decryptObject<any>(anyLoan.encryptedData);
    if (!decrypted) return serverErrorResponse('Failed to decrypt loan data');

  const { counterparty, payments = [], remainingAmount, amount: totalAmount, originalAmount, baseOriginalAmount, loanAdditions = [], description, comments, category, tags } = decrypted;

    // Authorization: owner, counterparty, accepted collaborator
    const canAddPayment = loan.userId === a.uid ||
      (counterparty && counterparty.userId === a.uid) ||
      loan.collaborators?.some((c: any) => c.userId === a.uid && c.status === 'accepted');

    if (!canAddPayment) {
      return unauthorizedResponse('Not authorized to add payments to this loan');
    }

    const body = await request.json();
    const { amount, date, method, notes } = body;

    if (!amount || amount <= 0) return errorResponse('Payment amount must be positive');
    if (amount > remainingAmount) return errorResponse(`Payment amount (${amount}) cannot exceed remaining amount (${remainingAmount})`);

    const newPayment: any = {
      _id: new mongoose.Types.ObjectId(),
      amount,
      date: date ? new Date(date) : new Date(),
      method: method || undefined,
      notes: notes || undefined,
      paidBy: a.uid,
      version: 1,
      createdAt: new Date(),
    };

    const updatedPayments = [...payments, newPayment];
    const newRemaining = Math.max(0, remainingAmount - amount);
    const newStatus = newRemaining === 0 ? 'paid' : loan.status;

    // Rebuild sensitive payload with all encrypted fields
    const updatedSensitive = {
      amount: totalAmount,
      originalAmount: originalAmount ?? totalAmount,
      baseOriginalAmount: baseOriginalAmount || originalAmount || totalAmount,
      remainingAmount: newRemaining,
      description: description || '',
      counterparty: counterparty || null,
      payments: updatedPayments,
      loanAdditions: loanAdditions,
      comments: comments || [],
      category: category || '',
      tags: tags || [],
    };

    const newEncryptedData = encryptObject(updatedSensitive);

    // Optimistic concurrency control based on version
    const prevVersion = loan.version || 1;
    const nextVersion = prevVersion + 1;

    const updateResult = await LoanModel.updateOne(
      { _id: loan._id, version: prevVersion },
      {
        $set: {
          encryptedData: newEncryptedData,
          status: newStatus,
          lastModifiedBy: a.uid,
          version: nextVersion,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return errorResponse('Concurrent modification detected. Please retry.');
    }

  // Fetch updated loan with decryption
  const refreshed = await LoanModel.findById(loan._id);
  return successResponse({ payment: newPayment, loan: refreshed }, 'Payment added successfully', 201);
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return serverErrorResponse(error?.message || 'Failed to add payment');
  }
}

// GET /api/loans/:id/payments - Get all payments for a loan
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id).select('userId encryptedData collaborators');
    if (!loan) return notFoundResponse('Loan not found');

  const anyLoan: any = loan;
  const decrypted = decryptObject<any>(anyLoan.encryptedData);
    if (!decrypted) return serverErrorResponse('Failed to decrypt loan data');

    const { counterparty, payments = [] } = decrypted;

    const hasAccess = loan.userId === a.uid ||
      (counterparty && counterparty.userId === a.uid) ||
      loan.collaborators?.some((c: any) => c.userId === a.uid);

    if (!hasAccess) return unauthorizedResponse('Access denied');

    return successResponse(payments);
  } catch (error: any) {
    console.error('Payments fetch error:', error);
    return serverErrorResponse(error?.message || 'Failed to fetch payments');
  }
}