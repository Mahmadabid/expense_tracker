import { NextRequest, NextResponse } from 'next/server';

// Simple auth verification for testing
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // For now, just return a mock user
    const mockUser = {
      _id: 'test-user-id',
      firebaseUid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      isGuest: false,
      preferences: {
        darkMode: false,
        currency: 'USD',
        timezone: 'UTC',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: mockUser,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}