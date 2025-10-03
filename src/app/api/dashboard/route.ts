import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { EntryModel, LoanModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils/apiResponse';

// Optimized: Single endpoint to fetch all dashboard data
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return unauthorizedResponse('Invalid token');
    }

    await connectDB();
    const userId = decodedToken.uid;

    // Fetch ALL active entries & loans for the user (no pagination)
    const [entries, loans] = await Promise.all([
      EntryModel.find({ userId, status: 'active' }).sort({ date: -1 }),
      LoanModel.find({ $or: [{ userId }, { 'collaborators.userId': userId }], status: 'active' }).sort({ date: -1 }),
    ]);
    // Calculate summaries
    const totalIncome = entries.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalExpense = entries.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalLoaned = loans.filter((l: any) => l.direction === 'lent').reduce((sum: number, l: any) => sum + (l.remainingAmount || 0), 0);
    const totalBorrowed = loans.filter((l: any) => l.direction === 'borrowed').reduce((sum: number, l: any) => sum + (l.remainingAmount || 0), 0);

    const balance = totalIncome - totalExpense;
    const netLoan = totalLoaned - totalBorrowed; // positive means others owe user
    const netWorth = balance + netLoan; // simplistic net worth metric

    return successResponse({
      summary: {
        totalIncome,
        totalExpense,
        balance,
        totalLoaned,
        totalBorrowed,
        netLoan,
        netWorth,
        totalsScope: 'all-active',
      },
      entries, // full arrays
      loans,
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return serverErrorResponse();
  }
}
