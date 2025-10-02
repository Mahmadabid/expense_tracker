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

    // Parallel fetch for performance
    const [entries, loans] = await Promise.all([
      EntryModel.find({ userId, status: 'active' }).sort({ date: -1 }).limit(50).lean(),
      LoanModel.find({ $or: [{ userId }, { 'collaborators.userId': userId }], status: 'active' }).sort({ date: -1 }).limit(50).lean(),
    ]);

    // Calculate summaries
    const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totalLoaned = loans.filter(l => l.direction === 'lent').reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalBorrowed = loans.filter(l => l.direction === 'borrowed').reduce((sum, l) => sum + l.remainingAmount, 0);

    return successResponse({
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        totalLoaned,
        totalBorrowed,
        netLoan: totalLoaned - totalBorrowed,
      },
      recentEntries: entries.slice(0, 10),
      recentLoans: loans.slice(0, 10),
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return serverErrorResponse();
  }
}
