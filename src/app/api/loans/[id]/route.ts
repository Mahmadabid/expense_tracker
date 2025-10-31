import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel, NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';
import mongoose from 'mongoose';

// Unified action POST: addPayment, addComment
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();
    // Optimized: Only fetch collaborator matching the authenticated user
    // Only allow access if user is owner, or if requiresCollaboration is true and user is counterparty/collaborator
    const loan = await LoanModel.findOne({
      _id: params.id,
      $or: [
        { userId: a.uid }, // User is owner - can always access
        { counterpartyUserId: a.uid, requiresCollaboration: true }, // User is counterparty and collaboration enabled
        { 'collaborators': { $elemMatch: { userId: a.uid, status: 'accepted' } }, requiresCollaboration: true }
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
    const requiresCollaboration = (loan as any).requiresCollaboration === true;

    if (action === 'addPayment') {
      // Only owner can add payments for non-collaborative loans
      // For collaborative loans, counterparty and collaborators can also add payments
      const canAddPayment = isOwner || (requiresCollaboration && (isCounterparty || !!collaborator));
      if (!canAddPayment) return unauthorizedResponse('Not authorized to add payments');
      const { amount, date, method, notes } = body;
      if (!amount || amount <= 0) return errorResponse('Payment amount must be positive');
      if (amount > (loan as any).remainingAmount) return errorResponse('Amount exceeds remaining balance');

      // Get user name for pending change
      const user = await UserModel.findOne({ firebaseUid: a.uid }).select('displayName').lean();
      const userName = user?.displayName || 'User';

      // For collaborative loans, create pending change if not the owner
      if (requiresCollaboration && !isOwner) {
        const pendingChange: any = {
          _id: new mongoose.Types.ObjectId(),
          type: 'payment',
          action: 'add',
          data: {
            amount,
            date: date ? new Date(date) : new Date(),
            method: method || undefined,
            notes: notes || undefined,
            paidBy: a.uid,
            version: 1,
          },
          requestedBy: a.uid,
          requestedByName: userName,
          status: 'pending',
          createdAt: new Date(),
        };

        if (!(loan as any).pendingChanges) (loan as any).pendingChanges = [];
        (loan as any).pendingChanges.push(pendingChange);
        loan.lastModifiedBy = a.uid;
        await loan.save();

        // Notify the owner about pending change
        await NotificationModel.create({
          userId: loan.userId,
          type: 'approval_request',
          title: 'Payment Approval Needed',
          message: `${userName} wants to add a payment of ${amount} to the loan`,
          relatedId: String(loan._id),
          relatedModel: 'Loan',
          actionUrl: `/loans/${String(loan._id)}`,
          priority: 'high',
        });

        return successResponse(pendingChange, 'Payment submitted for approval', 201);
      }

      // Owner can add directly
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
      const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
      let decrypted: any = {};

      if ((loan as any).encryptedData) {
        try {
          decrypted = decryptObject((loan as any).encryptedData);
        } catch (err) {
          console.error('Failed to decrypt loan data for payment:', err);
          return serverErrorResponse('Unable to process loan payment');
        }
      }

      const existingPayments: any[] = Array.isArray(decrypted.payments) ? decrypted.payments : [];
      const updatedPayments = [...existingPayments, newPayment];
      const loanAdditions: any[] = Array.isArray(decrypted.loanAdditions) ? decrypted.loanAdditions : [];

      const additionsTotal = loanAdditions.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);
      const baseOriginal = Number(decrypted.baseOriginalAmount ?? decrypted.originalAmount ?? decrypted.amount ?? 0);
      const totalPrincipal = baseOriginal + additionsTotal;
      const totalPaid = updatedPayments.reduce((sum: number, payment: any) => sum + (Number(payment?.amount) || 0), 0);
      const newRemaining = Math.max(totalPrincipal - totalPaid, 0);

      decrypted.payments = updatedPayments;
      decrypted.loanAdditions = loanAdditions;
      decrypted.originalAmount = baseOriginal;
      decrypted.baseOriginalAmount = baseOriginal;
      decrypted.amount = totalPrincipal;
      decrypted.remainingAmount = newRemaining;

      const newEncryptedData = encryptObject(decrypted);
      (loan as any).encryptedData = newEncryptedData;
      (loan as any).remainingAmount = newRemaining;
      (loan as any).payments = updatedPayments;
      loan.status = newRemaining === 0 ? 'paid' : 'active';
      loan.version = (loan.version || 1) + 1;
      loan.lastModifiedBy = a.uid;
      await loan.save();

      const updatedLoan = await LoanModel.findById(params.id);
      return successResponse({ loan: updatedLoan }, 'Payment added', 201);
    }

    if (action === 'addComment') {
      // Only owner can comment on non-collaborative loans
      // For collaborative loans, counterparty and collaborators can also comment
      const canComment = isOwner || (requiresCollaboration && (isCounterparty || !!collaborator));
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
    // Only allow access if user is owner, or if requiresCollaboration is true and user is counterparty/collaborator
    const loan = await LoanModel.findOne({
      _id: params.id,
      $or: [
        { userId: a.uid }, // User is owner - can always access
        { counterpartyUserId: a.uid, requiresCollaboration: true }, // User is counterparty and collaboration enabled
        { 'collaborators.userId': a.uid, requiresCollaboration: true } // User is collaborator and collaboration enabled
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
    const allowed = ['description','status','dueDate','counterparty'] as const;
    const changes: any[] = [];
    const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
    let decrypted: any = {};

    if ((loan as any).encryptedData) {
      try {
        decrypted = decryptObject((loan as any).encryptedData) || {};
      } catch (err) {
        console.error('Failed to decrypt loan data for update:', err);
        return serverErrorResponse('Unable to process loan update');
      }
    }

    if (!decrypted || typeof decrypted !== 'object') {
      decrypted = {};
    }

    const cloneSubdocs = (value: any): any[] => {
      if (!Array.isArray(value)) return [];
      return value.map((item) => {
        if (!item) return item;
        if (typeof item.toObject === 'function') {
          const plain = item.toObject({ depopulate: true, getters: false, virtuals: false, transform: undefined });
          if (plain && plain._id && typeof plain._id === 'object' && typeof plain._id.toString === 'function') {
            plain._id = plain._id.toString();
          }
          return plain;
        }
        if (typeof item.toJSON === 'function') {
          const plain = item.toJSON();
          if (plain && plain._id && typeof plain._id === 'object' && typeof plain._id.toString === 'function') {
            plain._id = plain._id.toString();
          }
          return plain;
        }
        try {
          return JSON.parse(JSON.stringify(item));
        } catch {
          return item;
        }
      });
    };

    const payments = cloneSubdocs(decrypted.payments ?? (loan as any).payments ?? []);
    const additions = cloneSubdocs(decrypted.loanAdditions ?? (loan as any).loanAdditions ?? []);

    decrypted.payments = payments;
    decrypted.loanAdditions = additions;

    loan.set('payments', payments, { strict: false });
    loan.set('loanAdditions', additions, { strict: false });

    let sensitiveChanged = false;

    if (body.amount !== undefined) {
      const newBasePrincipal = Number(body.amount);
      if (!Number.isFinite(newBasePrincipal) || newBasePrincipal <= 0) {
        return errorResponse('Amount must be positive');
      }

      const totalAdditions = additions.reduce((sum: number, addition: any) => sum + (Number(addition?.amount) || 0), 0);
      const totalPaid = payments.reduce((sum: number, payment: any) => sum + (Number(payment?.amount) || 0), 0);

      const previousBaseOriginal = Number(
        decrypted.baseOriginalAmount ??
        decrypted.originalAmount ??
        (loan as any).originalAmount ??
        (loan as any).baseOriginalAmount ??
        Math.max(((loan as any).amount || 0) - totalAdditions, 0)
      );
      const previousTotal = Number(decrypted.amount ?? (loan as any).amount ?? (previousBaseOriginal + totalAdditions));
      const calculatedFallbackRemaining = Math.max(previousTotal - totalPaid, 0);
      const previousRemaining = Number(decrypted.remainingAmount ?? (loan as any).remainingAmount ?? calculatedFallbackRemaining);

      const newTotalPrincipal = newBasePrincipal + totalAdditions;
      if (totalPaid > newTotalPrincipal) {
        return errorResponse('Existing payments exceed the new principal amount');
      }

      decrypted.originalAmount = newBasePrincipal;
      decrypted.baseOriginalAmount = newBasePrincipal;
      decrypted.amount = newTotalPrincipal;
      decrypted.remainingAmount = Math.max(newTotalPrincipal - totalPaid, 0);
      sensitiveChanged = true;

      loan.set('originalAmount', decrypted.originalAmount, { strict: false });
      loan.set('amount', decrypted.amount, { strict: false });
      loan.set('remainingAmount', decrypted.remainingAmount, { strict: false });

      if (previousBaseOriginal !== newBasePrincipal) {
        changes.push({ field: 'originalAmount', oldValue: previousBaseOriginal, newValue: newBasePrincipal });
        changes.push({ field: 'baseOriginalAmount', oldValue: previousBaseOriginal, newValue: newBasePrincipal });
      }
      if (previousTotal !== newTotalPrincipal) {
        changes.push({ field: 'amount', oldValue: previousTotal, newValue: newTotalPrincipal });
      }
      if (previousRemaining !== decrypted.remainingAmount) {
        changes.push({ field: 'remainingAmount', oldValue: previousRemaining, newValue: decrypted.remainingAmount });
      }
    }

    for (const key of allowed) {
      if (body[key] === undefined) continue;

      if (key === 'counterparty') {
        if ((loan as any).isPersonal) return errorResponse('Cannot update counterparty for personal loans');
        const incoming = body.counterparty || {};
        const incomingName = typeof incoming.name === 'string' ? incoming.name.trim() : '';
        if (!incomingName) return errorResponse('Counterparty name required');

        const existingCounterparty =
          (decrypted.counterparty && typeof decrypted.counterparty === 'object')
            ? JSON.parse(JSON.stringify(decrypted.counterparty))
            : (loan.counterparty ? JSON.parse(JSON.stringify(loan.counterparty)) : null);

        const updatedCounterparty = {
          ...(existingCounterparty || {}),
          name: incomingName,
          email: typeof incoming.email === 'string' && incoming.email.trim().length > 0 ? incoming.email.trim() : undefined,
          phone: typeof incoming.phone === 'string' && incoming.phone.trim().length > 0 ? incoming.phone.trim() : undefined,
        };

        if (JSON.stringify(existingCounterparty) === JSON.stringify(updatedCounterparty)) {
          continue;
        }

        decrypted.counterparty = updatedCounterparty;
        loan.set('counterparty', updatedCounterparty, { strict: false });
        sensitiveChanged = true;
        if (incoming.userId) {
          loan.counterpartyUserId = incoming.userId;
        }
        changes.push({ field: key, oldValue: existingCounterparty, newValue: updatedCounterparty });
        continue;
      }

      if (key === 'description') {
        const newDescription = typeof body.description === 'string' ? body.description.trim() : '';
        const oldValue = typeof decrypted.description === 'string' ? decrypted.description : '';
        if (newDescription === oldValue) continue;

        decrypted.description = newDescription;
        loan.set('description', newDescription, { strict: false });
        sensitiveChanged = true;
        changes.push({ field: key, oldValue, newValue: newDescription });
        continue;
      }

      if (key === 'dueDate') {
        const previousDate = loan.dueDate ? new Date(loan.dueDate) : undefined;
        const incomingValue = body.dueDate ? new Date(body.dueDate) : undefined;
        const previousTime = previousDate ? previousDate.getTime() : null;
        const incomingTime = incomingValue ? incomingValue.getTime() : null;
        if (previousTime === incomingTime) {
          continue;
        }
        loan.dueDate = incomingValue || undefined;
        changes.push({ field: key, oldValue: previousDate, newValue: loan.dueDate });
        continue;
      }

      if (key === 'status') {
        const oldValue = loan.status;
        if (body.status === oldValue) continue;
        loan.status = body.status;
        changes.push({ field: key, oldValue, newValue: loan.status });
        continue;
      }
    }

    if (changes.length === 0) {
      return errorResponse('No changes provided');
    }

    if (sensitiveChanged) {
      const newEncryptedData = encryptObject(decrypted);
      (loan as any).encryptedData = newEncryptedData;
      loan.markModified('encryptedData');
      loan.set('counterparty', decrypted.counterparty ?? null, { strict: false });
      loan.set('description', decrypted.description ?? '', { strict: false });
    }

    loan.lastModifiedBy = a.uid;
    await loan.save();

    const updatedLoan = await LoanModel.findById(params.id);
    return successResponse(updatedLoan ?? loan, 'Loan updated');
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
