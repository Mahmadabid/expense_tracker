import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
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

// GET /api/loans/:id/comments - Get all comments for a loan
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    return successResponse((loan as any).comments || []);
  } catch (error: any) {
    console.error('Comments fetch error:', error);
    return serverErrorResponse(error?.message || 'Failed to fetch comments');
  }
}

// POST /api/loans/:id/comments - Add a comment to a loan
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Allow loan owner, counterparty, or collaborators to add comments
    const canComment = loan.userId === a.uid || 
                      loan.counterparty?.userId === a.uid ||
                      loan.collaborators?.some(c => c.userId === a.uid && c.status === 'accepted');
    
    if (!canComment) {
      return unauthorizedResponse('Not authorized to comment on this loan');
    }

    const body = await request.json();
    const { message } = body;

    // Validate comment data
    if (!message || message.trim().length === 0) {
      return errorResponse('Comment message is required');
    }

    if (message.length > 1000) {
      return errorResponse('Comment message cannot exceed 1000 characters');
    }

    // Get user info for the comment
    const user = await UserModel.findOne({ firebaseUid: a.uid });
    const userName = user?.displayName || 'Anonymous User';

    // Add comment
    const newComment: any = {
      _id: new mongoose.Types.ObjectId(),
      userId: a.uid,
      userName,
      message: message.trim(),
      createdAt: new Date(),
    };
    
    if (!loan.comments) {
      loan.comments = [];
    }
    loan.comments.push(newComment);
    
    loan.lastModifiedBy = a.uid;
    await loan.save();

    return successResponse(newComment, 'Comment added successfully', 201);
  } catch (error: any) {
    console.error('Comment creation error:', error);
    return serverErrorResponse(error?.message || 'Failed to add comment');
  }
}
