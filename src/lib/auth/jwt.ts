import { adminAuth } from '../firebase/admin';
import { NextRequest } from 'next/server';
import { User } from '@/types';

export interface AuthenticatedRequest extends NextRequest {
  user: User;
}

export async function verifyFirebaseToken(idToken: string): Promise<any> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid token');
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

export async function authenticateRequest(request: NextRequest): Promise<any> {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    throw new Error('No authentication token provided');
  }
  
  return await verifyFirebaseToken(token);
}

export function createAuthError(message: string, status: number = 401): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}