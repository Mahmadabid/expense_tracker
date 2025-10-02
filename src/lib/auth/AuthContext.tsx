'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User, AuthContextType } from '@/types';
import { 
  signInWithGoogle, 
  signOut as firebaseSignOut, 
  onAuthStateChange,
  generateGuestToken,
  getIdToken
} from '../firebase/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Convert Firebase user to our User type
          const appUser: User = {
            _id: '', // Will be set from backend
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
            isGuest: false,
            preferences: {
              darkMode: false,
              currency: 'PKR',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // Sync user with backend
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('firebaseToken', token);
          
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Display-Name': appUser.displayName || '',
              'X-User-Email': appUser.email || '',
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser({ ...appUser, ...userData.data });
          } else {
            console.error('Failed to sync user with backend');
            setUser(appUser);
          }
        } catch (error) {
          console.error('Error processing user data:', error);
          setUser(null);
        }
      } else {
        // Check if there's a guest user in localStorage
        const guestToken = localStorage.getItem('guestToken');
        if (guestToken) {
          const guestUser: User = {
            _id: guestToken,
            firebaseUid: '',
            email: '',
            displayName: 'Guest User',
            isGuest: true,
            guestToken,
            preferences: {
              darkMode: localStorage.getItem('darkMode') === 'true',
              currency: 'PKR',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setUser(guestUser);
        } else {
          setUser(null);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<void> => {
    try {
      setLoading(true);
      await signInWithGoogle();
      // User state will be updated by the auth state listener
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await firebaseSignOut();
      localStorage.removeItem('guestToken');
      localStorage.removeItem('firebaseToken');
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async (): Promise<void> => {
    try {
      setLoading(true);
      const guestToken = generateGuestToken();
      localStorage.setItem('guestToken', guestToken);
      
      const guestUser: User = {
        _id: guestToken,
        firebaseUid: '',
        email: '',
        displayName: 'Guest User',
        isGuest: true,
        guestToken,
        preferences: {
          darkMode: false,
          currency: 'PKR',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setUser(guestUser);
    } catch (error) {
      console.error('Guest sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const claimGuestAccount = async (guestToken: string): Promise<void> => {
    try {
      setLoading(true);
      
      if (!user || user.isGuest) {
        throw new Error('Must be signed in with a regular account to claim guest data');
      }
      
      // Get the current Firebase user to get the token
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to get authentication token');
      }
      
      const response = await fetch('/api/auth/claim-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ guestToken }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to claim guest account');
      }
      
      // Refresh user data
      const updatedResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (updatedResponse.ok) {
        const userData = await updatedResponse.json();
        setUser({ ...user, ...userData.data });
      }
      
    } catch (error) {
      console.error('Claim guest account error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    signInAsGuest,
    claimGuestAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}