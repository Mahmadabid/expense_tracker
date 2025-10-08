import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';
import mongoose from 'mongoose';

// Unified action POST: addPayment, addComment
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();
    // Optimized: Only fetch collaborator matching the authenticated user
    const loan = await LoanModel.findOne({
      _id: params.id,
      $or: [
        { userId: a.uid },
        { counterpartyUserId: a.uid },
        { 'collaborators': { $elemMatch: { userId: a.uid, status: 'accepted' } } }
      ]
    });
    if (!loan) return notFoundResponse('Loan not found or access denied');

    const body = await request.json();
    const action = body.action;
    if (!action) return errorResponse('Action is required');

    // Access contexts
    const isOwner = loan.userId === a.uid;
    const isCounterparty = (loan as any).counterparty?.userId === a.uid;
    const collaborator = loan.collaborators?.find(c => c.userId === a.uid && c.status === 'accepted');

    if (action === 'addPayment') {
      const canAddPayment = isOwner || isCounterparty || !!collaborator;
      if (!canAddPayment) return unauthorizedResponse('Not authorized to add payments');
      const { amount, date, method, notes } = body;
      if (!amount || amount <= 0) return errorResponse('Payment amount must be positive');
      if (amount > (loan as any).remainingAmount) return errorResponse('Amount exceeds remaining balance');

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
      if (!loan.payments) (loan as any).payments = [];
      (loan as any).payments.push(newPayment);
      (loan as any).remainingAmount = Math.max(0, (loan as any).remainingAmount - amount);
      if ((loan as any).remainingAmount === 0) loan.status = 'paid';
      loan.version = (loan.version || 1) + 1;
      loan.lastModifiedBy = a.uid;
      await loan.save();
      return successResponse(newPayment, 'Payment added', 201);
    }

    if (action === 'addComment') {
      const canComment = isOwner || isCounterparty || !!collaborator;
      if (!canComment) return unauthorizedResponse('Not authorized to comment');
      const { message } = body;
      if (!message || message.trim().length === 0) return errorResponse('Comment message required');
      if (message.length > 1000) return errorResponse('Comment too long');
      const user = await UserModel.findOne({ firebaseUid: a.uid });
      const userName = user?.displayName || 'Anonymous User';
      const newComment: any = {
        _id: new mongoose.Types.ObjectId(),
        userId: a.uid,
        userName,
        message: message.trim(),
        createdAt: new Date(),
      };
      if (!loan.comments) (loan as any).comments = [];
      (loan as any).comments.push(newComment);
      loan.lastModifiedBy = a.uid;
      await loan.save();
      return successResponse(newComment, 'Comment added', 201);
    }

    return errorResponse('Unsupported action');
  } catch (err: any) {
    console.error('Loan action error:', err);
    return serverErrorResponse(err?.message || 'Loan action failed');
  }
}

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// GET /api/loans/:id
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();
    
    // Optimized: Query with access filter built-in, no post-query filtering needed
    const loan = await LoanModel.findOne({
      _id: params.id,
      $or: [
        { userId: a.uid },
        { counterpartyUserId: a.uid },
        { 'collaborators.userId': a.uid }
      ]
    });
    
    if (!loan) {
      return notFoundResponse('Loan not found or access denied');
    }
    return successResponse(loan);
  } catch (err) {
    console.error('Loan get error:', err);
    return serverErrorResponse();
  }
}

// PUT /api/loans/:id
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    // Optimized: Query with edit permission filter built-in
    const loan = await LoanModel.findOne({
      _id: params.id,
      $or: [
        { userId: a.uid },
        { 'collaborators': { $elemMatch: { 
          userId: a.uid, 
          status: 'accepted',
          role: { $in: ['owner', 'collaborator'] }
        }}}
      ]
    });
    
    if (!loan) return unauthorizedResponse('Loan not found or not allowed');

    const body = await request.json();
    const allowed = ['description','amount','status','dueDate','counterparty'];
    const changes: any[] = [];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        const oldValue = (loan as any)[key];
        if (key === 'amount') {
          if (body.amount <= 0) return errorResponse('Amount must be positive');
          loan.amount = body.amount;
          // Adjust remaining if amount reduced below remaining
          if (loan.remainingAmount > body.amount) loan.remainingAmount = body.amount;
        } else if (key === 'dueDate') {
          loan.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
        } else if (key === 'counterparty') {
          // Can't update counterparty for personal loans
          if ((loan as any).isPersonal) return errorResponse('Cannot update counterparty for personal loans');
          if (!body.counterparty.name) return errorResponse('Counterparty name required');
          if (loan.counterparty) {
            loan.counterparty.name = body.counterparty.name;
            loan.counterparty.email = body.counterparty.email || undefined;
            loan.counterparty.phone = body.counterparty.phone || undefined;
          }
        } else {
          (loan as any)[key] = body[key];
        }
        changes.push({ field: key, oldValue, newValue: (loan as any)[key] });
      }
    }

    if (changes.length === 0) {
      return errorResponse('No changes provided');
    }

    loan.lastModifiedBy = a.uid;
    await loan.save();

    return successResponse(loan, 'Loan updated');
  } catch (err: any) {
    console.error('Loan update error:', err);
    return serverErrorResponse(err?.message || 'Failed to update loan');
  }
}

// DELETE /api/loans/:id (hard delete for now)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();
    
    // Optimized: Delete directly with filter, no need to fetch first
    const result = await LoanModel.deleteOne({
      _id: params.id,
      $or: [
        { userId: a.uid },
        { 'collaborators': { $elemMatch: { 
          userId: a.uid, 
          status: 'accepted',
          role: { $in: ['owner', 'collaborator'] }
        }}}
      ]
    });
    
    if (result.deletedCount === 0) {
      return unauthorizedResponse('Loan not found or not allowed');
    }

    return successResponse({ id: params.id }, 'Loan deleted');
  } catch (err) {
    console.error('Loan delete error:', err);
    return serverErrorResponse();
  }
}
