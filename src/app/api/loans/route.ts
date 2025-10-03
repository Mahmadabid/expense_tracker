import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/loans - list loans for user (owned or collaborator)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const direction = searchParams.get('direction');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const base: any = { 
      $or: [ 
        { userId: decoded.uid }, 
        { 'collaborators.userId': decoded.uid },
        { 'counterparty.userId': decoded.uid }  // Allow counterparty to see their loans
      ] 
    };
    if (status) base.status = status;
    if (direction) base.direction = direction;

    // Remove .lean() to allow mongoose middleware to decrypt
    const loans = await LoanModel.find(base).sort({ date: -1 }).limit(limit);
    return successResponse(loans);
  } catch (err) {
    console.error('Loans list error:', err);
    return serverErrorResponse();
  }
}

// POST /api/loans - create a loan
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    const body = await request.json();
    const { amount, currency, description, direction, counterparty, dueDate, tags } = body;

    // Basic validation
    if (!amount || amount <= 0) return errorResponse('Amount must be positive');
    if (!currency) return errorResponse('Currency is required');
    if (!direction || !['lent','borrowed'].includes(direction)) return errorResponse('Direction must be lent or borrowed');
    if (!counterparty || !counterparty.name) return errorResponse('Counterparty name is required');

    await connectDB();
    const userId = decoded.uid;

    const loanData: any = {
      userId,
      type: 'loan',
      amount,
      currency,
      date: new Date(),
      status: 'active',
      tags: tags || [],
      version: 1,
      createdBy: userId,
      lastModifiedBy: userId,
      direction,
      counterparty: {
        userId: counterparty.userId || undefined,
        name: counterparty.name,
        email: counterparty.email || undefined,
        phone: counterparty.phone || undefined,
      },
      originalAmount: amount,
      remainingAmount: amount,
      payments: [],
      comments: [],
      collaborators: [],
      pendingApprovals: [],
    };

    // Only add optional fields if they are provided
    if (description) loanData.description = description;
    if (dueDate) loanData.dueDate = new Date(dueDate);

    const loan = await LoanModel.create(loanData);

    return successResponse(loan, 'Loan created successfully', 201);
  } catch (error: any) {
    console.error('Loan creation error:', error);
    return serverErrorResponse(error?.message || 'Failed to create loan');
  }
}
