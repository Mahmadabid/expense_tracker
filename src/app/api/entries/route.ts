import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { EntryModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/entries - List entries with filters
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) return unauthorizedResponse('No token provided');

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) return unauthorizedResponse('Invalid token');

    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'active';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const query: any = { userId: decodedToken.uid, status };
    if (type) query.type = type;

    // Optimized: Select only necessary fields for list view
    const entries = await EntryModel.find(query)
      .select('type amount date category description status tags createdAt')
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    return successResponse(entries);
  } catch (error) {
    console.error('Entries fetch error:', error);
    return serverErrorResponse();
  }
}

// POST /api/entries - Create entry
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) return unauthorizedResponse('No token provided');

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) return unauthorizedResponse('Invalid token');

    const body = await request.json();
    const { type, amount, currency, description, category, date, tags } = body;

    if (!type || !amount || !currency) {
      return errorResponse('Missing required fields: type, amount, currency');
    }

    if (!['income', 'expense'].includes(type)) {
      return errorResponse('Invalid type. Must be income or expense');
    }

    if (amount <= 0) {
      return errorResponse('Amount must be positive');
    }

    await connectDB();
    const userId = decodedToken.uid;

    const entry = await EntryModel.create({
      userId,
      type,
      amount,
      currency,
      description,
      category: category || undefined,
      date: date ? new Date(date) : new Date(),
      status: 'active',
      tags: tags || [],
      version: 1,
      createdBy: userId,
      lastModifiedBy: userId,
    });

    return successResponse(entry, 'Entry created successfully', 201);
  } catch (error: any) {
    console.error('Entry creation error:', error);
    return serverErrorResponse(error?.message || 'Failed to create entry');
  }
}
