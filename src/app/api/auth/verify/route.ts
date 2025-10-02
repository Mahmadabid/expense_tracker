import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils/apiResponse';

export async function POST(request: NextRequest) {
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

    let user = await UserModel.findByFirebaseUid(decodedToken.uid);
    
    if (!user) {
      user = await UserModel.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        photoURL: decodedToken.picture,
        isGuest: false,
        preferences: {
          darkMode: false,
          currency: 'PKR',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
        lastActive: new Date(),
      });
    } else {
      user.lastActive = new Date();
      await user.save();
    }

    return successResponse({
      _id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isGuest: user.isGuest,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return serverErrorResponse();
  }
}
