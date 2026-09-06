import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { InteractionRecord } from '../types';

/**
 * Defensive utility: Recursively strip any undefined values to ensure zero-crash payload hygiene.
 */
export function stripUndefined<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Save an interaction into the user's owner-bound Firestore collection:
 * /users/{userId}/interactions/{interactionId}
 */
export async function saveUserInteraction(
  userId: string,
  record: InteractionRecord
): Promise<void> {
  if (!userId || !record.id) {
    throw new Error('User ID and Interaction ID are required for Firestore persistence');
  }

  const docRef = doc(db, 'users', userId, 'interactions', record.id);
  const cleanPayload = stripUndefined({
    ...record,
    userId,
    updatedAt: serverTimestamp(),
  });

  await setDoc(docRef, cleanPayload, { merge: true });
}

/**
 * Delete an interaction from the user's owner-bound Firestore collection.
 */
export async function deleteUserInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) return;
  const docRef = doc(db, 'users', userId, 'interactions', interactionId);
  await deleteDoc(docRef);
}

/**
 * Subscribe in real-time to user's owner-bound interactions.
 */
export function subscribeUserInteractions(
  userId: string,
  onUpdate: (records: InteractionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'interactions');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: InteractionRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          type: data.type || 'prompt',
          input: data.input || '',
          output: data.output || '',
          modelUsed: data.modelUsed || 'gemini-3.6-flash',
          latencyMs: data.latencyMs || 0,
          fallbackCount: data.fallbackCount || 0,
          timestamp: data.timestamp || new Date().toISOString(),
          status: data.status || 'success',
        });
      });
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}
