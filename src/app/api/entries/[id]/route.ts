import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { EntryModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/utils/apiResponse';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) return unauthorizedResponse('Invalid token');

    const { id } = await context.params;
    await connectDB();

    // Remove .lean() to allow mongoose middleware to decrypt
    const entry = await EntryModel.findOne({ _id: id, userId: decodedToken.uid });
    if (!entry) return notFoundResponse('Entry not found');

    return successResponse(entry);
  } catch (error) {
    console.error('Entry fetch error:', error);
    return serverErrorResponse();
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) return unauthorizedResponse('Invalid token');

    const { id } = await context.params;
    const body = await request.json();
    await connectDB();

    const entry = await EntryModel.findOne({ _id: id, userId: decodedToken.uid });
    if (!entry) return notFoundResponse('Entry not found');

    const changes: any[] = [];
    ['amount', 'description', 'category', 'date', 'status'].forEach(field => {
      if (body[field] !== undefined && (entry as any)[field] !== body[field]) {
        changes.push({ field, oldValue: (entry as any)[field], newValue: body[field] });
        (entry as any)[field] = body[field];
      }
    });

    entry.lastModifiedBy = decodedToken.uid;
    await entry.save();

    return successResponse(entry, 'Entry updated successfully');
  } catch (error: any) {
    console.error('Entry update error:', error);
    return serverErrorResponse(error?.message || 'Failed to update entry');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) return unauthorizedResponse('Invalid token');

    const { id } = await context.params;
    await connectDB();

    const entry = await EntryModel.findOneAndDelete({ _id: id, userId: decodedToken.uid });
    if (!entry) return notFoundResponse('Entry not found');

    return successResponse(null, 'Entry deleted successfully');
  } catch (error) {
    console.error('Entry delete error:', error);
    return serverErrorResponse();
  }
}