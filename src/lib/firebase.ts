import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test helper mandated by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt reading a test doc to verify online status
    await getDocFromServer(doc(db, '_health', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database is unreachable:', error.message);
      return false;
    }
    // Permission-denied is expected due to zero-insecure defaults and still verifies network reachability
    return true;
  }
}

export {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
};
export type { User };
