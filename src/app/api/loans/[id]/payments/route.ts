import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
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

// POST /api/loans/:id/payments - Add payment to loan
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const { id } = await params;
    await connectDB();

    const loan = await LoanModel.findById(id);
    if (!loan) return notFoundResponse('Loan not found');

    // Allow loan owner, counterparty, or collaborators to add payments
    const canAddPayment = loan.userId === a.uid || 
                         loan.counterparty?.userId === a.uid ||
                         loan.collaborators?.some(c => c.userId === a.uid && c.status === 'accepted');
    
    if (!canAddPayment) {
      return unauthorizedResponse('Not authorized to add payments to this loan');
    }

    const body = await request.json();
    const { amount, date, method, notes } = body;

    // Validate payment data
    if (!amount || amount <= 0) {
      return errorResponse('Payment amount must be positive');
    }

    if (amount > loan.remainingAmount) {
      return errorResponse(`Payment amount (${amount}) cannot exceed remaining loan amount (${loan.remainingAmount})`);
    }

    // Add payment manually instead of using the model method
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
    
    loan.payments.push(newPayment);
    loan.remainingAmount = Math.max(0, loan.remainingAmount - amount);
    
    if (loan.remainingAmount === 0) {
      loan.status = 'paid';
    }
    
    loan.version = (loan.version || 1) + 1;
    loan.lastModifiedBy = a.uid;

    await loan.save();

    return successResponse(newPayment, 'Payment added successfully', 201);
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return serverErrorResponse(error?.message || 'Failed to add payment');
  }
}

// GET /api/loans/:id/payments - Get all payments for a loan
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    await connectDB();

    // Remove .lean() for decryption middleware
    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Check access permissions
    const hasAccess = loan.userId === a.uid || 
                     (loan as any).counterparty?.userId === a.uid ||
                     (loan as any).collaborators?.some((c: any) => c.userId === a.uid);
    
    if (!hasAccess) {
      return unauthorizedResponse('Access denied');
    }

    return successResponse(loan.payments || []);
  } catch (error: any) {
    console.error('Payments fetch error:', error);
    return serverErrorResponse(error?.message || 'Failed to fetch payments');
  }
}