'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/components/ui/Toaster';
import { User as FirebaseUser } from 'firebase/auth';
import { User, AuthContextType } from '@/types';
import { 
  signInWithGoogle, 
  signOut as firebaseSignOut, 
  onAuthStateChange,
  generateGuestToken,
  getIdToken
} from '../firebase/auth';
import { hasGuestDataToSync, syncGuestDataToCloud, getGuestDataCount } from '../utils/guestSync';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Check if there's guest data before processing authentication
          const wasGuest = localStorage.getItem('guestToken');
          const hasGuestData = wasGuest ? hasGuestDataToSync() : false;
          const guestCounts = hasGuestData ? getGuestDataCount() : null;
          
          // Convert Firebase user to our User type
          const appUser: User = {
            _id: '', // Will be set from backend
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
            isGuest: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // Sync user with backend (Firebase manages tokens securely)
          const token = await firebaseUser.getIdToken();
          
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
          
          // After successful authentication, sync guest data if any exists
          if (hasGuestData && guestCounts && wasGuest) {
            // Remove guest token to prevent showing as guest anymore
            localStorage.removeItem('guestToken');
            
            const confirmSync = window.confirm(
              `You have ${guestCounts.entries} entries and ${guestCounts.loans} loans saved as a guest. ` +
              `Would you like to sync them to your account?`
            );
            
            if (confirmSync) {
              try {
                const result = await syncGuestDataToCloud();
                
                if (result.success) {
                  addToast({ type: 'success', title: 'Synced', description: `Successfully synced ${result.entriesSynced} entries and ${result.loansSynced} loans to your account!` });
                } else {
                  addToast({ type: 'warning', title: 'Partial Sync', description: `Partial sync: ${result.entriesSynced} entries, ${result.loansSynced} loans. ${result.errors.length > 0 ? 'Errors: ' + result.errors.join(', ') : ''}` });
                }
              } catch (syncError) {
                console.error('Sync error:', syncError);
                addToast({ type: 'error', title: 'Sync Failed', description: 'Failed to sync guest data. Your local data is still saved.' });
              }
            }
          } else if (wasGuest) {
            // No data to sync, just remove guest token
            localStorage.removeItem('guestToken');
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
      
      // Trigger Google sign in - guest data sync will be handled in onAuthStateChange
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