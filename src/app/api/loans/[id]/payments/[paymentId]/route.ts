import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// GET /api/loans/:id/payments/:paymentId - Get specific payment
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Check access permissions
    const hasAccess = loan.userId === a.uid || 
                     (loan as any).counterparty?.userId === a.uid ||
                     (loan as any).collaborators?.some((c: any) => c.userId === a.uid);
    
    if (!hasAccess) {
      return unauthorizedResponse('Access denied');
    }

    const payment = (loan as any).payments?.find((p: any) => p._id.toString() === params.paymentId);
    if (!payment) return notFoundResponse('Payment not found');

    return successResponse(payment);
  } catch (error: any) {
    console.error('Payment fetch error:', error);
    return serverErrorResponse(error?.message || 'Failed to fetch payment');
  }
}

// PUT /api/loans/:id/payments/:paymentId - Update payment
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    const payment = loan.payments?.find(p => p._id.toString() === params.paymentId);
    if (!payment) return notFoundResponse('Payment not found');

    // Only the person who made the payment or loan owner can edit it
    if (payment.paidBy !== a.uid && loan.userId !== a.uid) {
      return unauthorizedResponse('Not authorized to edit this payment');
    }

    const body = await request.json();
    const { amount, date, method, notes } = body;

    // Validate new amount
    if (amount !== undefined) {
      if (amount <= 0) {
        return errorResponse('Payment amount must be positive');
      }
      
      // Calculate what the remaining amount would be
      const amountDifference = amount - payment.amount;
      const newRemainingAmount = loan.remainingAmount + amountDifference;
      
      if (newRemainingAmount < 0) {
        return errorResponse('Updated payment amount would exceed the loan amount');
      }
      
      payment.amount = amount;
      loan.remainingAmount = newRemainingAmount;
    }

    if (date !== undefined) payment.date = new Date(date);
    if (method !== undefined) payment.method = method;
    if (notes !== undefined) payment.notes = notes;

    payment.version = (payment.version || 1) + 1;

    // Update loan status if needed
    if (loan.remainingAmount === 0 && loan.status !== 'paid') {
      loan.status = 'paid';
    } else if (loan.remainingAmount > 0 && loan.status === 'paid') {
      loan.status = 'active';
    }

    loan.lastModifiedBy = a.uid;
    await loan.save();

    return successResponse(payment, 'Payment updated successfully');
  } catch (error: any) {
    console.error('Payment update error:', error);
    return serverErrorResponse(error?.message || 'Failed to update payment');
  }
}

// DELETE /api/loans/:id/payments/:paymentId - Delete payment
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    const paymentIndex = loan.payments?.findIndex(p => p._id.toString() === params.paymentId);
    if (paymentIndex === undefined || paymentIndex === -1) {
      return notFoundResponse('Payment not found');
    }

    const payment = loan.payments[paymentIndex];

    // Only the person who made the payment or loan owner can delete it
    if (payment.paidBy !== a.uid && loan.userId !== a.uid) {
      return unauthorizedResponse('Not authorized to delete this payment');
    }

    const isOwner = loan.userId === a.uid;
    const requiresCollaboration = (loan as any).requiresCollaboration;

    // If this is a collaborative loan and the deleter is not the owner, create a pending change
    if (requiresCollaboration && !isOwner) {
      // Resolve user display name
      let userName: string | undefined = undefined;
      try {
        const { UserModel } = await import('@/lib/models');
        const userDoc = await UserModel.findOne({ firebaseUid: a.uid });
        userName = userDoc?.displayName || 'User';
      } catch {}

      const pendingChange = {
        _id: new (await import('mongoose')).default.Types.ObjectId(),
        type: 'payment_deletion',
        action: 'delete',
        data: { paymentId: params.paymentId },
        requestedBy: a.uid,
        requestedByName: userName || 'User',
        status: 'pending',
        createdAt: new Date()
      } as any;

      (loan as any).pendingChanges = (loan as any).pendingChanges || [];
      (loan as any).pendingChanges.push(pendingChange);
      await loan.save();

      // Notify owner
      try {
        const { NotificationModel } = await import('@/lib/models');
        await NotificationModel.create({
          userId: loan.userId,
          title: 'Payment Deletion Pending Approval',
          message: `${userName || 'Someone'} wants to delete a payment of ${loan.currency || 'PKR'} ${payment.amount.toFixed(2)}`,
          type: 'loan_update',
          relatedLoan: loan._id,
          relatedUser: a.uid,
          createdAt: new Date()
        });
      } catch (err) {
        console.error('Failed to send notification:', err);
      }

      return successResponse(pendingChange, 'Payment deletion submitted for approval', 201);
    }

    // Owner or non-collaborative loan: perform immediate deletion
    // Restore the amount to remaining balance
    loan.remainingAmount += payment.amount;
    
    // Update status if needed
    if (loan.status === 'paid' && loan.remainingAmount > 0) {
      loan.status = 'active';
    }

    // Remove the payment
    loan.payments.splice(paymentIndex, 1);
    loan.lastModifiedBy = a.uid;
    await loan.save();

    return successResponse({ id: params.paymentId }, 'Payment deleted successfully');
  } catch (error: any) {
    console.error('Payment deletion error:', error);
    return serverErrorResponse(error?.message || 'Failed to delete payment');
  }
}