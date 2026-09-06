import React, { useEffect, useState } from 'react';
import { Terminal, Trash2, RefreshCw, CheckCircle2, AlertCircle, Clock, Shield, Database, User as UserIcon } from 'lucide-react';
import { InteractionRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeUserInteractions,
  deleteUserInteraction,
} from '../lib/firestoreService';

export const AuditLogTab: React.FC = () => {
  const { currentUser, firestoreConnected } = useAuth();
  const [sourceMode, setSourceMode] = useState<'server' | 'firestore'>('server');
  const [records, setRecords] = useState<InteractionRecord[]>([]);
  const [firestoreRecords, setFirestoreRecords] = useState<InteractionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServerRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/interactions');
      if (!res.ok) throw new Error('Failed to fetch interaction audit records');
      const data = await res.json();
      setRecords(data.interactions || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to owner-bound Firestore subcollection if currentUser is active
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserInteractions(
      currentUser.uid,
      (liveDocs) => {
        setFirestoreRecords(liveDocs);
      },
      (err) => {
        console.warn('[Firestore] Realtime subscription issue:', err.message);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const deleteRecord = async (id: string) => {
    try {
      if (sourceMode === 'firestore' && currentUser) {
        await deleteUserInteraction(currentUser.uid, id);
      } else {
        const res = await fetch(`/api/interactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setRecords((prev) => prev.filter((r) => r.id !== id));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    }
  };

  const clearAll = async () => {
    try {
      if (sourceMode === 'firestore' && currentUser) {
        await Promise.all(firestoreRecords.map((r) => deleteUserInteraction(currentUser.uid, r.id)));
      } else {
        const res = await fetch('/api/interactions', { method: 'DELETE' });
        if (res.ok) {
          setRecords([]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to clear store');
    }
  };

  useEffect(() => {
    fetchServerRecords();
  }, []);

  const activeRecords = sourceMode === 'firestore' ? firestoreRecords : records;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                DIRECTIVE 3 & 6 &bull; PERSISTENCE & TRANSACTION VERIFICATION
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Durable Transaction Audit Store
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Guaranteed transaction log of all inputs, model responses, fallback latency, and status. Payloads strictly cleaned with <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 font-mono">stripUndefined</code> prior to persistence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchServerRecords}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors font-mono"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {activeRecords.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-800 transition-colors font-mono"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Storage Mode Toggle */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">DATA STORE:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setSourceMode('server')}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  sourceMode === 'server'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Server Audit Log ({records.length})
              </button>
              <button
                onClick={() => setSourceMode('firestore')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                  sourceMode === 'firestore'
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3 h-3" />
                <span>Firestore Owner-Bound ({firestoreRecords.length})</span>
              </button>
            </div>
          </div>

          {sourceMode === 'firestore' && (
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span>Target: <code className="text-indigo-300">/users/{currentUser ? currentUser.uid.slice(0, 8) + '...' : '{userId}'}/interactions</code></span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Record list */}
      {activeRecords.length === 0 && !loading ? (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
          <div>
            No audit records logged yet in {sourceMode === 'firestore' ? 'Firestore user subcollection' : 'the server audit store'}.
          </div>
          {sourceMode === 'firestore' && !currentUser && (
            <div className="text-amber-400 text-[11px]">
              Tip: Click &quot;Sign In&quot; in the header to authenticate and link owner-bound records directly to your Firestore account.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeRecords.map((r) => (
            <div
              key={r.id}
              className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5 hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {r.type.toUpperCase()}
                  </span>
                  <span className="font-mono text-emerald-400 text-[11px]">{r.modelUsed}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 font-mono text-[11px]">{r.latencyMs} ms</span>
                  {r.fallbackCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                      {r.fallbackCount} failovers
                    </span>
                  )}
                  {sourceMode === 'firestore' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" />
                      Firestore
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[10px] flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => deleteRecord(r.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 truncate">
                <span className="text-slate-500 mr-2">INPUT:</span>
                {r.input}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-400 max-h-24 overflow-y-auto whitespace-pre-wrap">
                <span className="text-slate-500 mr-2">OUTPUT:</span>
                {r.output.slice(0, 300)}
                {r.output.length > 300 ? '...' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
