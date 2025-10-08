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

// PUT - edit a loan addition (amount or description)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string; additionId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const { id, additionId } = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(id);
    if (!loan) return notFoundResponse('Loan not found');

    const canEdit = loan.userId === a.uid || loan.canUserEdit(a.uid);
    if (!canEdit) return unauthorizedResponse('Not authorized');

    const body = await request.json();
    const { amount, description } = body;
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) return errorResponse('Amount must be positive');

    const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
    const decrypted: any = decryptObject((loan as any).encryptedData);

    const additions: any[] = decrypted.loanAdditions || [];
    const target = additions.find(a => a._id?.toString() === additionId);
    if (!target) return notFoundResponse('Addition not found');

    const oldAmount = target.amount;
    if (amount !== undefined) {
      // Adjust running amount & remaining based on delta
      const delta = amount - oldAmount;
      target.amount = amount;
      decrypted.amount += delta; // running total
      decrypted.remainingAmount += delta; // user still owes this extra unless paid
      if (decrypted.remainingAmount < 0) decrypted.remainingAmount = 0;
    }
    if (description !== undefined) target.description = description || undefined;
    target.version = (target.version || 1) + 1;
    target.updatedAt = new Date();

    // Audit comment
    const userDoc = await UserModel.findOne({ firebaseUid: a.uid });
    const userName = userDoc?.displayName || 'User';
    const mongooseMod = await import('mongoose');
    decrypted.comments = [ ...(decrypted.comments || []), {
      _id: new mongooseMod.default.Types.ObjectId(),
      userId: a.uid,
      userName,
      message: `Edited addition ${amount !== undefined ? 'amount to +' + (loan.currency || 'PKR') + ' ' + amount.toFixed(2) : ''}${description ? ' desc: ' + description : ''}`.trim(),
      createdAt: new Date(),
    } ];

    decrypted.loanAdditions = additions;

    (loan as any).encryptedData = encryptObject(decrypted);
    loan.lastModifiedBy = a.uid;
    loan.version = (loan.version || 1) + 1;
    await loan.save();

    const updated = await LoanModel.findById(id);
    return successResponse(updated, 'Addition updated');
  } catch (error: any) {
    console.error('Edit addition error:', error);
    return serverErrorResponse(error?.message || 'Failed');
  }
}

// DELETE - remove a loan addition
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; additionId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const { id, additionId } = await context.params;
    await connectDB();
    const loan = await LoanModel.findById(id);
    if (!loan) return notFoundResponse('Loan not found');

    const canEdit = loan.userId === a.uid || loan.canUserEdit(a.uid);
    if (!canEdit) return unauthorizedResponse('Not authorized');

    const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
    const decrypted: any = decryptObject((loan as any).encryptedData);
    const additions: any[] = decrypted.loanAdditions || [];
    const idx = additions.findIndex(a => a._id?.toString() === additionId);
    if (idx === -1) return notFoundResponse('Addition not found');

    const removed = additions[idx];
    // Adjust running principal & remaining by removing this addition amount
    decrypted.amount -= removed.amount;
    decrypted.remainingAmount = Math.max(0, decrypted.remainingAmount - removed.amount);
    additions.splice(idx, 1);

    // Audit comment
    const mongooseMod2 = await import('mongoose');
    decrypted.comments = [ ...(decrypted.comments || []), {
      _id: new mongooseMod2.default.Types.ObjectId(),
      userId: a.uid,
      userName: 'System',
      message: `Deleted addition of +${loan.currency || 'PKR'} ${removed.amount.toFixed(2)}`,
      createdAt: new Date(),
    } ];

    decrypted.loanAdditions = additions;
    (loan as any).encryptedData = encryptObject(decrypted);
    loan.lastModifiedBy = a.uid;
    loan.version = (loan.version || 1) + 1;
    await loan.save();

    const updated = await LoanModel.findById(id);
    return successResponse(updated, 'Addition deleted');
  } catch (error: any) {
    console.error('Delete addition error:', error);
    return serverErrorResponse(error?.message || 'Failed');
  }
}
