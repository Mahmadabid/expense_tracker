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
        lastActive: new Date(),
      });
    } else {
      user.lastActive = new Date();
      await user.save();
    }

    // Create response with user data
    const response = successResponse({
      _id: String(user._id),
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    // Set HTTP-only cookie with the Firebase token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth verification error:', error);
    return serverErrorResponse();
  }
}
