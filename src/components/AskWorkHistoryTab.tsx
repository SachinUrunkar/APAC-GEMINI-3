import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Send,
  RotateCw,
  Copy,
  Check,
  Trash2,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Search,
  BookOpen,
  FileText,
  Briefcase,
  Award,
  Calendar,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EngineeringLog,
  AchievementRecord,
  StandupRecord,
  SprintSummaryRecord,
  MemoryQueryRecord,
} from '../types';
import {
  subscribeUserEngineeringLogs,
  subscribeUserAchievements,
  subscribeUserStandups,
  subscribeUserSprintSummaries,
  saveMemoryQueryRecord,
  deleteMemoryQueryRecord,
  subscribeUserMemoryQueries,
} from '../lib/firestoreService';

const SAMPLE_QUESTIONS = [
  'What were my biggest accomplishments this month?',
  'What technologies have I used most often?',
  'What blockers occur repeatedly?',
  'Which projects produced the highest impact?',
  'Show examples of leadership activities.',
  'Summarize my growth over the past month.',
];

export const AskWorkHistoryTab: React.FC = () => {
  const { currentUser, loginWithGoogle } = useAuth();

  // Inputs & User Collections
  const [question, setQuestion] = useState('');
  const [engineeringLogs, setEngineeringLogs] = useState<EngineeringLog[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [standups, setStandups] = useState<StandupRecord[]>([]);
  const [sprintSummaries, setSprintSummaries] = useState<SprintSummaryRecord[]>([]);
  const [memoryQueries, setMemoryQueries] = useState<MemoryQueryRecord[]>([]);

  // Generation & Active Query State
  const [querying, setQuerying] = useState(false);
  const [queryStatus, setQueryStatus] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<{
    question: string;
    answer: string;
    evidence: string[];
    sources: string[];
    usedModel?: string;
    totalLatencyMs?: number;
    notice?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);

  // Subscriptions to current user's collections
  useEffect(() => {
    if (!currentUser) {
      setEngineeringLogs([]);
      setAchievements([]);
      setStandups([]);
      setSprintSummaries([]);
      setMemoryQueries([]);
      return;
    }

    const unsubLogs = subscribeUserEngineeringLogs(
      currentUser.uid,
      (logs) => setEngineeringLogs(logs),
      (err) => console.warn('[Firestore] Memory logs sub error:', err.message)
    );

    const unsubAchs = subscribeUserAchievements(
      currentUser.uid,
      (achs) => setAchievements(achs),
      (err) => console.warn('[Firestore] Memory achs sub error:', err.message)
    );

    const unsubStandups = subscribeUserStandups(
      currentUser.uid,
      (st) => setStandups(st),
      (err) => console.warn('[Firestore] Memory standups sub error:', err.message)
    );

    const unsubSummaries = subscribeUserSprintSummaries(
      currentUser.uid,
      (sums) => setSprintSummaries(sums),
      (err) => console.warn('[Firestore] Memory summaries sub error:', err.message)
    );

    const unsubQueries = subscribeUserMemoryQueries(
      currentUser.uid,
      (queries) => setMemoryQueries(queries),
      (err) => console.warn('[Firestore] Memory queries sub error:', err.message)
    );

    return () => {
      unsubLogs();
      unsubAchs();
      unsubStandups();
      unsubSummaries();
      unsubQueries();
    };
  }, [currentUser]);

  // Handle Query Submission
  const handleQueryWorkHistory = async (targetQuestion?: string) => {
    const queryText = targetQuestion || question;
    if (!queryText.trim()) {
      setErrorMessage('Please enter or select a question to ask your work history.');
      return;
    }

    if (!currentUser) {
      setErrorMessage('Please sign in to query your work history and save memory records.');
      return;
    }

    setQuerying(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setQueryStatus('Analyzing work history records via Gemini fallback ladder (gemini-3.6-flash)...');

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/query-work-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          question: queryText.trim(),
          engineeringLogs,
          achievementRecords: achievements,
          standupRecords: standups,
          sprintSummaryRecords: sprintSummaries,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const resultObj = {
        question: data.question || queryText,
        answer: data.answer || '',
        evidence: Array.isArray(data.evidence) ? data.evidence : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        usedModel: data.usedModel || 'gemini-3.6-flash',
        totalLatencyMs: data.totalLatencyMs || 0,
        notice: data.notice,
      };

      setActiveResult(resultObj);

      // Auto-persist query record into Firestore memoryQueries
      try {
        const savedId = await saveMemoryQueryRecord(currentUser.uid, {
          question: resultObj.question,
          answer: resultObj.answer,
          evidence: resultObj.evidence,
          sources: resultObj.sources,
          modelUsed: resultObj.usedModel,
          totalLatencyMs: resultObj.totalLatencyMs,
          createdAt: new Date().toISOString(),
        });
        setActiveQueryId(savedId);
      } catch (saveErr: any) {
        console.warn('[Firestore] Memory query auto-save notice:', saveErr.message);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to query work history. You can retry with your preserved context.'
      );
    } finally {
      setQuerying(false);
      setQueryStatus(null);
    }
  };

  // Reopen past conversation from history drawer
  const handleReopenQuery = (record: MemoryQueryRecord) => {
    setQuestion(record.question);
    setActiveResult({
      question: record.question,
      answer: record.answer,
      evidence: record.evidence || [],
      sources: record.sources || [],
      usedModel: record.modelUsed,
      totalLatencyMs: record.totalLatencyMs,
    });
    setActiveQueryId(record.id);
    setSaveSuccess(`Reopened past conversation: "${record.question.slice(0, 45)}..."`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Delete query record
  const handleDeleteQuery = async (queryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    try {
      await deleteMemoryQueryRecord(currentUser.uid, queryId);
      if (activeQueryId === queryId) {
        setActiveQueryId(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete memory query record');
    }
  };

  // Copy active answer to clipboard
  const handleCopyToClipboard = async () => {
    if (!activeResult) return;
    const formattedText = `Question: ${activeResult.question}\n\nAnswer:\n${activeResult.answer}\n\nEvidence:\n${activeResult.evidence.map((e) => `- ${e}`).join('\n')}\n\nSources Used:\n${activeResult.sources.map((s) => `- ${s}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = formattedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mission Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                <BrainCircuit className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Ask My Work History
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                TASK 5 &bull; AI MEMORY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
              Ask natural language questions about your past accomplishments, engineering work logs, standup updates, and sprint summaries. Get backed answers with concrete supporting evidence and source citations.
            </p>
          </div>

          {/* User Isolation Badge */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-[11px]">
              <div className="text-slate-400">MEMORY SCOPE:</div>
              <div className="text-indigo-300 font-bold">
                {currentUser ? `uid: ${currentUser.uid.slice(0, 10)}...` : 'Unauthenticated'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Guard Banner if not logged in */}
      {!currentUser && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-amber-300">Sign in to Access Your AI Work Memory</div>
              <div className="text-slate-400">
                Your memory queries and work history records are strictly bound to your authenticated UID namespace.
              </div>
            </div>
          </div>
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium font-mono transition-all shrink-0 shadow-[0_0_12px_rgba(79,70,229,0.3)]"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {/* Preset Starter Questions Chips */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preset Starter Questions:</span>
          </label>

          {/* Sourced Records Metrics */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-indigo-400" />
              <span>{engineeringLogs.length} Logs</span>
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>{achievements.length} Achs</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" />
              <span>{standups.length} Standups</span>
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-emerald-400" />
              <span>{sprintSummaries.length} Summaries</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              id={`btn-starter-q-${idx}`}
              onClick={() => {
                setQuestion(sq);
                handleQueryWorkHistory(sq);
              }}
              disabled={querying || !currentUser}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 text-xs font-medium font-sans transition-all text-left flex items-center gap-1.5 group"
            >
              <span>{sq}</span>
              <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Section */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>Enter Your Work History Question:</span>
          </label>
          <div className="relative">
            <textarea
              id="input-work-history-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What were my biggest technical accomplishments over the past month? What technologies have I used most frequently?"
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Submit & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            id="btn-ask-work-history"
            onClick={() => handleQueryWorkHistory()}
            disabled={querying || !currentUser || !question.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.35)]"
          >
            {querying ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Querying AI Memory...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ask Work History</span>
              </>
            )}
          </button>

          {querying && (
            <span className="text-xs font-mono text-indigo-400 flex items-center gap-2 animate-pulse">
              <span>&bull;</span>
              <span>{queryStatus || 'Synthesizing work history memory...'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Error Recovery Banner */}
      {errorMessage && (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-4 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Memory Query Error</span>
            </div>
            <button
              onClick={() => handleQueryWorkHistory()}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700 text-[11px] transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry Query</span>
            </button>
          </div>
          <p className="text-rose-200/80 text-[11px] font-sans pl-6">{errorMessage}</p>
        </div>
      )}

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 text-xs font-mono flex items-center justify-between gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button
            onClick={() => setSaveSuccess(null)}
            className="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Active AI Response View */}
      {activeResult && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Response Header & Telemetry */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                QUESTION SUBMITTED
              </div>
              <h2 className="text-sm font-bold text-white font-sans">
                "{activeResult.question}"
              </h2>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0">
              {activeResult.usedModel && (
                <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                  Model: {activeResult.usedModel}
                </span>
              )}
              {activeResult.totalLatencyMs !== undefined && (
                <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400">
                  {activeResult.totalLatencyMs}ms
                </span>
              )}

              <button
                id="btn-copy-memory-result"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-indigo-400" />
                    <span>Copy Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Standby / Fallback notice */}
          {activeResult.notice && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl px-3.5 py-2 text-[11px] font-mono text-amber-300/90 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{activeResult.notice}</span>
            </div>
          )}

          {/* 1. Answer Section */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Answer:</span>
            </div>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-sans text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
              {activeResult.answer}
            </div>
          </div>

          {/* 2. Supporting Evidence Section */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Supporting Evidence:</span>
            </div>
            {activeResult.evidence.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                No specific supporting evidence points extracted.
              </div>
            ) : (
              <ul className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-sans text-slate-300">
                {activeResult.evidence.map((ev, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-mono font-bold select-none">•</span>
                    <span className="leading-relaxed">{ev}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 3. Source References Section */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sources Used:</span>
            </div>
            {activeResult.sources.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                No explicit source references cited.
              </div>
            ) : (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-wrap items-center gap-2">
                {activeResult.sources.map((src, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-indigo-300"
                  >
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Memory Question History Drawer */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Previous Memory Conversations
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {memoryQueries.length} stored
            </span>
          </div>
        </div>

        {memoryQueries.length === 0 ? (
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
            <BrainCircuit className="w-8 h-8 text-slate-600 mx-auto" />
            <div>No previous memory queries stored in your Firestore namespace.</div>
            <div className="text-[11px] text-slate-500">
              Ask any question above and its answer, evidence, and sources will automatically persist here.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {memoryQueries.map((mq) => {
              const isSelected = activeQueryId === mq.id;
              return (
                <div
                  key={mq.id}
                  onClick={() => handleReopenQuery(mq)}
                  className={`bg-[#161B22] border rounded-2xl p-5 text-xs space-y-3 cursor-pointer transition-all shadow-sm ${
                    isSelected
                      ? 'border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.15)] bg-slate-900/90'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        MEMORY QUERY
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(mq.createdAt).toLocaleDateString()}{' '}
                        {new Date(mq.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {mq.modelUsed && (
                        <span className="text-[10px] font-mono text-slate-500">
                          via {mq.modelUsed}
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDeleteQuery(mq.id, e)}
                        title="Delete memory query from Firestore"
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="font-bold text-white text-xs font-sans flex items-center justify-between">
                    <span>"{mq.question}"</span>
                    <span className="text-[10px] font-mono text-indigo-400 hover:underline">
                      Reopen conversation &rarr;
                    </span>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 font-sans text-[11px] leading-relaxed text-slate-300 line-clamp-3">
                    {mq.answer}
                  </div>

                  {mq.sources && mq.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-1">
                      <span className="text-slate-500">Sources:</span>
                      {mq.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
