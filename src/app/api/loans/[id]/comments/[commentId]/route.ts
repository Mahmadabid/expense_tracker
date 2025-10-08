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

// GET /api/loans/:id/comments/:commentId - Get specific comment
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Decrypt to get counterparty and comments
    const { decryptObject } = await import('@/lib/utils/encryption');
    const loanAny = loan as any;
    let decrypted: any = {};
    
    if (loanAny.encryptedData) {
      try {
        decrypted = decryptObject(loanAny.encryptedData);
      } catch (err) {
        console.error('Failed to decrypt loan data:', err);
        return serverErrorResponse('Failed to process loan data');
      }
    }

    // Check access permissions
    const hasAccess = loan.userId === a.uid || 
                     decrypted.counterparty?.userId === a.uid ||
                     loan.collaborators?.some((c: any) => c.userId === a.uid);
    
    if (!hasAccess) {
      return unauthorizedResponse('Access denied');
    }

    const comment = decrypted.comments?.find((c: any) => c._id.toString() === params.commentId);
    if (!comment) return notFoundResponse('Comment not found');

    return successResponse(comment);
  } catch (error: any) {
    console.error('Comment fetch error:', error);
    return serverErrorResponse(error?.message || 'Failed to fetch comment');
  }
}

// PUT /api/loans/:id/comments/:commentId - Update comment
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Decrypt to get comments
    const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
    const loanAny = loan as any;
    let decrypted: any = {};
    
    if (loanAny.encryptedData) {
      try {
        decrypted = decryptObject(loanAny.encryptedData);
      } catch (err) {
        console.error('Failed to decrypt loan data:', err);
        return serverErrorResponse('Failed to process loan data');
      }
    }

    const comment = decrypted.comments?.find((c: any) => c._id.toString() === params.commentId);
    if (!comment) return notFoundResponse('Comment not found');

    // Only the person who made the comment can edit it
    if (comment.userId !== a.uid) {
      return unauthorizedResponse('Not authorized to edit this comment');
    }

    const body = await request.json();
    const { message } = body;

    // Validate new message
    if (!message || message.trim().length === 0) {
      return errorResponse('Comment message is required');
    }

    if (message.length > 1000) {
      return errorResponse('Comment message cannot exceed 1000 characters');
    }

    // Update the comment
    comment.message = message.trim();
    comment.updatedAt = new Date();

    // Rebuild encrypted data with updated comment
    const updatedSensitive = {
      amount: decrypted.amount || 0,
      originalAmount: decrypted.originalAmount || 0,
      remainingAmount: decrypted.remainingAmount || 0,
      description: decrypted.description || '',
      counterparty: decrypted.counterparty || null,
      payments: decrypted.payments || [],
      comments: decrypted.comments || [],
      category: decrypted.category || '',
      tags: decrypted.tags || [],
    };

    const newEncryptedData = encryptObject(updatedSensitive);
    loanAny.encryptedData = newEncryptedData;
    
    loan.lastModifiedBy = a.uid;
    loan.version = (loan.version || 1) + 1;
    await loan.save();

    return successResponse(comment, 'Comment updated successfully');
  } catch (error: any) {
    console.error('Comment update error:', error);
    return serverErrorResponse(error?.message || 'Failed to update comment');
  }
}

// DELETE /api/loans/:id/comments/:commentId - Delete comment
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Decrypt to get comments
    const { decryptObject, encryptObject } = await import('@/lib/utils/encryption');
    const loanAny = loan as any;
    let decrypted: any = {};
    
    if (loanAny.encryptedData) {
      try {
        decrypted = decryptObject(loanAny.encryptedData);
      } catch (err) {
        console.error('Failed to decrypt loan data:', err);
        return serverErrorResponse('Failed to process loan data');
      }
    }

    const commentIndex = decrypted.comments?.findIndex((c: any) => c._id.toString() === params.commentId);
    if (commentIndex === undefined || commentIndex === -1) {
      return notFoundResponse('Comment not found');
    }

    const comment = decrypted.comments[commentIndex];

    // Only the person who made the comment or loan owner can delete it
    if (comment.userId !== a.uid && loan.userId !== a.uid) {
      return unauthorizedResponse('Not authorized to delete this comment');
    }

    // Remove the comment
    decrypted.comments.splice(commentIndex, 1);

    // Rebuild encrypted data without the deleted comment
    const updatedSensitive = {
      amount: decrypted.amount || 0,
      originalAmount: decrypted.originalAmount || 0,
      remainingAmount: decrypted.remainingAmount || 0,
      description: decrypted.description || '',
      counterparty: decrypted.counterparty || null,
      payments: decrypted.payments || [],
      comments: decrypted.comments || [],
      category: decrypted.category || '',
      tags: decrypted.tags || [],
    };

    const newEncryptedData = encryptObject(updatedSensitive);
    loanAny.encryptedData = newEncryptedData;
    
    loan.lastModifiedBy = a.uid;
    loan.version = (loan.version || 1) + 1;
    await loan.save();

    return successResponse({ id: params.commentId }, 'Comment deleted successfully');
  } catch (error: any) {
    console.error('Comment deletion error:', error);
    return serverErrorResponse(error?.message || 'Failed to delete comment');
  }
}
