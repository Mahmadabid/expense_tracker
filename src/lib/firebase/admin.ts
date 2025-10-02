import { cert, getApps, initializeApp as initializeAdminApp, App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;

export function getFirebaseAdmin(): App {
  if (getApps().length === 0) {
    adminApp = initializeAdminApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    adminApp = getApps()[0];
  }
  return adminApp;
}

export function getAdminAuthInstance(): Auth {
  return getAdminAuth(getFirebaseAdmin());
}

export async function verifyIdToken(token: string) {
  try {
    const auth = getAdminAuthInstance();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export const adminAuth = getAdminAuthInstance();