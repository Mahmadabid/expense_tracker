'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export type AuthUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSeen?: Date | null;
};

export type AuthContextValue = {
  user: User | null;
  profile: AuthUserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistUserProfile(user: User, displayName?: string | null) {
  const token = await user.getIdToken();
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: displayName ?? user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to persist user profile");
  }

  const payload = await response.json();
  return payload.data as {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
}

async function fetchUserProfile(user: User) {
  const token = await user.getIdToken();
  const response = await fetch(`/api/users?uid=${user.uid}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error("Unable to fetch user profile");
  }
  const payload = await response.json();
  return payload.data as {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const persisted = await persistUserProfile(firebaseUser);
          const profileData = persisted ?? (await fetchUserProfile(firebaseUser));

          setUser(firebaseUser);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: profileData?.displayName ?? firebaseUser.displayName,
            photoURL: profileData?.photoURL ?? firebaseUser.photoURL,
            lastSeen: profileData?.lastSeen ? new Date(profileData.lastSeen) : null,
          });
        } catch (error) {
          console.error("Failed to synchronize user profile", error);
          setUser(firebaseUser);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            lastSeen: null,
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => {
    const handleAuthError = (error: unknown) => {
      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError("Something went wrong. Please try again.");
      }
    };

    const signInWithGoogleFn = async () => {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      if (credential.user) {
        await persistUserProfile(credential.user);
      }
    };

    const signOutFn = async () => {
      await signOut(auth);
    };

    return {
      user,
      profile,
      loading,
      authError,
      signInWithGoogle: async () => {
        try {
          await signInWithGoogleFn();
        } catch (error) {
          handleAuthError(error);
          throw error;
        }
      },
      signOutUser: async () => {
        try {
          await signOutFn();
        } catch (error) {
          handleAuthError(error);
          throw error;
        }
      },
    } satisfies AuthContextValue;
  }, [user, profile, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
