import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { InteractionRecord, EngineeringLog, JournalEntry, AchievementRecord, StandupRecord, SprintSummaryRecord } from '../types';

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

// ---------------------------------------------------------------------------
// DevLog AI: Engineering Work Logs Persistence (/users/{userId}/engineeringLogs)
// ---------------------------------------------------------------------------

/**
 * Save or create an Engineering Log entry in the user's owner-bound collection.
 */
export async function saveEngineeringLog(
  userId: string,
  log: Omit<EngineeringLog, 'id' | 'userId'> & { id?: string }
): Promise<string> {
  if (!userId) throw new Error('Authentication required: userId is missing');
  const logId = log.id || `eng_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, 'users', userId, 'engineeringLogs', logId);

  const cleanPayload = stripUndefined({
    ...log,
    id: logId,
    userId,
    entryType: 'engineering_log',
    createdAt: log.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverSavedAt: serverTimestamp(),
  });

  await setDoc(docRef, cleanPayload, { merge: true });
  return logId;
}

/**
 * Delete an Engineering Log from the user's owner-bound collection.
 */
export async function deleteEngineeringLog(
  userId: string,
  logId: string
): Promise<void> {
  if (!userId || !logId) return;
  const docRef = doc(db, 'users', userId, 'engineeringLogs', logId);
  await deleteDoc(docRef);
}

/**
 * Subscribe in real-time to user's owner-bound Engineering Logs.
 */
export function subscribeUserEngineeringLogs(
  userId: string,
  onUpdate: (logs: EngineeringLog[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'engineeringLogs');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: EngineeringLog[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          userId,
          entryType: 'engineering_log',
          title: data.title || 'Untitled Log',
          workPerformed: data.workPerformed || '',
          challengesEncountered: data.challengesEncountered || '',
          learnings: data.learnings || '',
          technologiesUsed: Array.isArray(data.technologiesUsed) ? data.technologiesUsed : [],
          impactOutcome: data.impactOutcome || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Engineering logs realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// ---------------------------------------------------------------------------
// Baseline Journal Entries: Backward Compatibility (/users/{userId}/journalEntries)
// ---------------------------------------------------------------------------

/**
 * Save or create a baseline Journal Entry in the user's owner-bound collection.
 */
export async function saveJournalEntry(
  userId: string,
  entry: Omit<JournalEntry, 'id' | 'userId'> & { id?: string }
): Promise<string> {
  if (!userId) throw new Error('Authentication required: userId is missing');
  const entryId = entry.id || `jrnl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, 'users', userId, 'journalEntries', entryId);

  const cleanPayload = stripUndefined({
    ...entry,
    id: entryId,
    userId,
    entryType: 'journal_entry',
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverSavedAt: serverTimestamp(),
  });

  await setDoc(docRef, cleanPayload, { merge: true });
  return entryId;
}

/**
 * Delete a Journal Entry from the user's owner-bound collection.
 */
export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) return;
  const docRef = doc(db, 'users', userId, 'journalEntries', entryId);
  await deleteDoc(docRef);
}

/**
 * Subscribe in real-time to user's owner-bound Journal Entries.
 */
export function subscribeUserJournalEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'journalEntries');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: JournalEntry[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          userId,
          entryType: 'journal_entry',
          title: data.title || 'Untitled Journal',
          content: data.content || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Journal entries realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// ---------------------------------------------------------------------------
// AI Achievement Extraction Engine: Persistence (/users/{userId}/achievements)
// ---------------------------------------------------------------------------

/**
 * Save a single extracted AchievementRecord to the user's owner-bound subcollection.
 */
export async function saveAchievementRecord(
  userId: string,
  achievement: Omit<AchievementRecord, 'id' | 'userId'> & { id?: string }
): Promise<string> {
  if (!userId) throw new Error('Authentication required: userId is missing');
  const achievementId =
    achievement.id || `ach_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, 'users', userId, 'achievements', achievementId);

  const cleanPayload = stripUndefined({
    ...achievement,
    id: achievementId,
    userId,
    createdAt: achievement.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverSavedAt: serverTimestamp(),
  });

  await setDoc(docRef, cleanPayload, { merge: true });
  return achievementId;
}

/**
 * Batch save multiple extracted AchievementRecords into the user's owner-bound collection.
 */
export async function saveBatchAchievements(
  userId: string,
  achievements: (Omit<AchievementRecord, 'id' | 'userId'> & { id?: string })[]
): Promise<string[]> {
  if (!userId) throw new Error('Authentication required: userId is missing');
  const savedIds: string[] = [];

  for (const ach of achievements) {
    const id = await saveAchievementRecord(userId, ach);
    savedIds.push(id);
  }

  return savedIds;
}

/**
 * Delete an AchievementRecord from the user's owner-bound collection.
 */
export async function deleteAchievementRecord(
  userId: string,
  achievementId: string
): Promise<void> {
  if (!userId || !achievementId) return;
  const docRef = doc(db, 'users', userId, 'achievements', achievementId);
  await deleteDoc(docRef);
}

/**
 * Real-time subscription to all AchievementRecords for a user, sorted by createdAt descending.
 */
export function subscribeUserAchievements(
  userId: string,
  onUpdate: (achievements: AchievementRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'achievements');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: AchievementRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          userId,
          engineeringLogId: data.engineeringLogId || '',
          logTitle: data.logTitle || '',
          category: data.category || 'Technical Impact',
          evidence: data.evidence || '',
          impactLevel: data.impactLevel || 'MEDIUM',
          confidence: data.confidence || 'HIGH',
          createdAt: data.createdAt || new Date().toISOString(),
          modelUsed: data.modelUsed,
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Achievements realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to AchievementRecords specifically belonging to an EngineeringLog.
 */
export function subscribeLogAchievements(
  userId: string,
  engineeringLogId: string,
  onUpdate: (achievements: AchievementRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId || !engineeringLogId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'achievements');
  const q = query(colRef, where('engineeringLogId', '==', engineeringLogId));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: AchievementRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          userId,
          engineeringLogId: data.engineeringLogId || engineeringLogId,
          logTitle: data.logTitle || '',
          category: data.category || 'Technical Impact',
          evidence: data.evidence || '',
          impactLevel: data.impactLevel || 'MEDIUM',
          confidence: data.confidence || 'HIGH',
          createdAt: data.createdAt || new Date().toISOString(),
          modelUsed: data.modelUsed,
          updatedAt: data.updatedAt,
        });
      });
      // Sort in-memory by createdAt descending
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Log achievements realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// ---------------------------------------------------------------------------
// AI Standup Generator: Owner-Bound Standups (/users/{userId}/standups)
// ---------------------------------------------------------------------------

/**
 * Save an AI-generated Standup Record into user's owner-bound collection:
 * /users/{userId}/standups/{standupId}
 */
export async function saveStandupRecord(
  userId: string,
  standup: Omit<StandupRecord, 'id' | 'userId'> & { id?: string }
): Promise<string> {
  if (!userId) {
    throw new Error('Authentication required: userId is missing');
  }
  const standupId =
    standup.id || `standup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const docRef = doc(db, 'users', userId, 'standups', standupId);

  const cleanPayload = stripUndefined({
    ...standup,
    id: standupId,
    userId,
    createdAt: standup.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverSavedAt: serverTimestamp(),
  });

  await setDoc(docRef, cleanPayload, { merge: true });
  return standupId;
}

/**
 * Delete a Standup Record from user's owner-bound collection.
 */
export async function deleteStandupRecord(
  userId: string,
  standupId: string
): Promise<void> {
  if (!userId || !standupId) return;
  const docRef = doc(db, 'users', userId, 'standups', standupId);
  await deleteDoc(docRef);
}

/**
 * Real-time subscription to user's owner-bound Standup Records.
 */
export function subscribeUserStandups(
  userId: string,
  onUpdate: (standups: StandupRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'standups');
  const q = query(colRef, orderBy('generatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: StandupRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          userId,
          period: data.period || '24h',
          content: data.content || '',
          generatedAt: data.generatedAt || new Date().toISOString(),
          sourceLogs: Array.isArray(data.sourceLogs) ? data.sourceLogs : [],
          modelUsed: data.modelUsed,
          totalLatencyMs: data.totalLatencyMs,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Standups realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// ---------------------------------------------------------------------------
// AI Sprint Summary Generator: Owner-Bound Sprint Summaries (/users/{userId}/sprintSummaries)
// ---------------------------------------------------------------------------

/**
 * Save an AI-generated Sprint Summary Record into user's owner-bound collection:
 * /users/{userId}/sprintSummaries/{summaryId}
 */
export async function saveSprintSummaryRecord(
  userId: string,
  summary: Omit<SprintSummaryRecord, 'id' | 'userId'> & { id?: string }
): Promise<string> {
  if (!userId) {
    throw new Error('Authentication required: userId is missing');
  }
  const summaryId =
    summary.id || `sprint_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const docRef = doc(db, 'users', userId, 'sprintSummaries', summaryId);

  const cleanPayload = stripUndefined({
    ...summary,
    id: summaryId,
    userId,
    createdAt: summary.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverSavedAt: serverTimestamp(),
  });

  await setDoc(docRef, cleanPayload, { merge: true });
  return summaryId;
}

/**
 * Delete a Sprint Summary Record from user's owner-bound collection.
 */
export async function deleteSprintSummaryRecord(
  userId: string,
  summaryId: string
): Promise<void> {
  if (!userId || !summaryId) return;
  const docRef = doc(db, 'users', userId, 'sprintSummaries', summaryId);
  await deleteDoc(docRef);
}

/**
 * Real-time subscription to user's owner-bound Sprint Summary Records.
 */
export function subscribeUserSprintSummaries(
  userId: string,
  onUpdate: (summaries: SprintSummaryRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'sprintSummaries');
  const q = query(colRef, orderBy('generatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: SprintSummaryRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          userId,
          period: data.period || '14d',
          summary: data.summary || '',
          generatedAt: data.generatedAt || new Date().toISOString(),
          sourceLogs: Array.isArray(data.sourceLogs) ? data.sourceLogs : [],
          customStartDate: data.customStartDate,
          customEndDate: data.customEndDate,
          modelUsed: data.modelUsed,
          totalLatencyMs: data.totalLatencyMs,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(results);
    },
    (err) => {
      console.warn('[Firestore] Sprint summaries realtime subscription error:', err);
      if (onError) onError(err);
    }
  );
}



