import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/utils/apiResponse';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) return unauthorizedResponse('Invalid token');

    const body = await request.json();
    await connectDB();

    const user = await UserModel.findByFirebaseUid(decodedToken.uid);
    if (!user) return notFoundResponse('User not found');

    if (body.darkMode !== undefined) user.preferences.darkMode = body.darkMode;
    if (body.currency) user.preferences.currency = body.currency;
    if (body.timezone) user.preferences.timezone = body.timezone;

    await user.save();

    return successResponse({
      preferences: user.preferences,
    }, 'Preferences updated successfully');
  } catch (error: any) {
    console.error('Preferences update error:', error);
    return serverErrorResponse(error?.message || 'Failed to update preferences');
  }
}
