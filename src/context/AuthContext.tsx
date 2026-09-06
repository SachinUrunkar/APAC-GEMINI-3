import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  testFirestoreConnection,
  User,
} from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  firestoreConnected: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  firestoreConnected: false,
  loginWithGoogle: async () => {},
  loginAnonymously: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState(false);

  useEffect(() => {
    // Check Firestore connection on initial boot (Mandated by Firebase Integration Skill)
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('[Firebase Auth] Popup sign in canceled or failed:', err.message);
      // Fallback to anonymous if popup is blocked in iframe
      try {
        await firebaseSignInAnonymously(auth);
      } catch (anonErr) {
        console.error('[Firebase Auth] Anonymous fallback failed:', anonErr);
      }
    }
  };

  const loginAnonymously = async () => {
    try {
      await firebaseSignInAnonymously(auth);
    } catch (err) {
      console.error('[Firebase Auth] Anonymous sign in failed:', err);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('[Firebase Auth] Sign out failed:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        firestoreConnected,
        loginWithGoogle,
        loginAnonymously,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
