import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Save,
  Trash2,
  Clock,
  Layers,
  Award,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CalendarDays,
  Target,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EngineeringLog,
  AchievementRecord,
  StandupRecord,
  SprintSummaryRecord,
  SprintSummaryPeriod,
} from '../types';
import {
  subscribeUserEngineeringLogs,
  subscribeUserAchievements,
  subscribeUserStandups,
  saveSprintSummaryRecord,
  deleteSprintSummaryRecord,
  subscribeUserSprintSummaries,
} from '../lib/firestoreService';

export const SprintSummaryTab: React.FC = () => {
  const { currentUser, loginWithGoogle } = useAuth();

  // Period Selection: '7d' | '14d' | '30d' | 'custom'
  const [selectedPeriod, setSelectedPeriod] = useState<SprintSummaryPeriod>('14d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // User-isolated collections
  const [engineeringLogs, setEngineeringLogs] = useState<EngineeringLog[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [standups, setStandups] = useState<StandupRecord[]>([]);
  const [savedSummaries, setSavedSummaries] = useState<SprintSummaryRecord[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [generatedModelUsed, setGeneratedModelUsed] = useState<string | null>(null);
  const [generatedLatencyMs, setGeneratedLatencyMs] = useState<number | null>(null);
  const [activeSourceLogs, setActiveSourceLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [showSourceInspection, setShowSourceInspection] = useState(false);

  // Subscriptions to current user's collections
  useEffect(() => {
    if (!currentUser) {
      setEngineeringLogs([]);
      setAchievements([]);
      setStandups([]);
      setSavedSummaries([]);
      return;
    }

    const unsubLogs = subscribeUserEngineeringLogs(
      currentUser.uid,
      (logs) => setEngineeringLogs(logs),
      (err) => console.warn('[Firestore] Sprint logs sub error:', err.message)
    );

    const unsubAchs = subscribeUserAchievements(
      currentUser.uid,
      (achs) => setAchievements(achs),
      (err) => console.warn('[Firestore] Sprint achs sub error:', err.message)
    );

    const unsubStandups = subscribeUserStandups(
      currentUser.uid,
      (st) => setStandups(st),
      (err) => console.warn('[Firestore] Sprint standups sub error:', err.message)
    );

    const unsubSummaries = subscribeUserSprintSummaries(
      currentUser.uid,
      (sums) => setSavedSummaries(sums),
      (err) => console.warn('[Firestore] Sprint summaries sub error:', err.message)
    );

    return () => {
      unsubLogs();
      unsubAchs();
      unsubStandups();
      unsubSummaries();
    };
  }, [currentUser]);

  // Determine time bounds based on selection
  const getTimeBounds = (): { startMs: number; endMs: number } => {
    const now = Date.now();
    if (selectedPeriod === '7d') {
      return { startMs: now - 7 * 24 * 60 * 60 * 1000, endMs: now };
    }
    if (selectedPeriod === '14d') {
      return { startMs: now - 14 * 24 * 60 * 60 * 1000, endMs: now };
    }
    if (selectedPeriod === '30d') {
      return { startMs: now - 30 * 24 * 60 * 60 * 1000, endMs: now };
    }
    // custom
    const startMs = customStart ? new Date(customStart).getTime() : now - 14 * 24 * 60 * 60 * 1000;
    const endMs = customEnd ? new Date(customEnd).getTime() + 24 * 60 * 60 * 1000 - 1 : now;
    return { startMs, endMs };
  };

  const { startMs, endMs } = getTimeBounds();

  // Filter logs, achievements, and standups
  const filteredLogs = engineeringLogs.filter((log) => {
    const t = new Date(log.createdAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  const filteredAchievements = achievements.filter((ach) => {
    const t = new Date(ach.createdAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  const filteredStandups = standups.filter((st) => {
    const t = new Date(st.generatedAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  // Generate Sprint Summary Handler
  const handleGenerateSummary = async (isRetry = false) => {
    if (!currentUser) {
      setErrorMessage('Please sign in to generate and persist your sprint summary.');
      return;
    }

    setGenerating(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setGenerationStatus('Synthesizing sprint report via Gemini fallback ladder (gemini-3.6-flash)...');

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/generate-sprint-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          period: selectedPeriod,
          customStartDate: selectedPeriod === 'custom' ? customStart : undefined,
          customEndDate: selectedPeriod === 'custom' ? customEnd : undefined,
          engineeringLogs: filteredLogs,
          achievementRecords: filteredAchievements,
          standupRecords: filteredStandups,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setGeneratedSummary(data.summary || '');
      setGeneratedModelUsed(data.usedModel || 'gemini-3.6-flash');
      setGeneratedLatencyMs(data.totalLatencyMs || 0);
      setActiveSourceLogs(data.sourceLogs || filteredLogs.map((l) => l.id));
      if (data.notice) {
        setGenerationNotice(data.notice);
      } else {
        setGenerationNotice(null);
      }
    } catch (err: any) {
      console.warn('[Sprint Summary Generation Notice]:', err.message);
      setErrorMessage(
        err.message || 'Failed to generate sprint summary. You can retry with your preserved logs.'
      );
    } finally {
      setGenerating(false);
      setGenerationStatus(null);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!generatedSummary) return;
    try {
      await navigator.clipboard.writeText(generatedSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = generatedSummary;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Save generated summary to Firestore
  const handleSaveSummary = async () => {
    if (!currentUser || !generatedSummary) return;
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const summaryId = await saveSprintSummaryRecord(currentUser.uid, {
        period:
          selectedPeriod === 'custom'
            ? `custom (${customStart} to ${customEnd})`
            : selectedPeriod,
        summary: generatedSummary,
        generatedAt: new Date().toISOString(),
        sourceLogs: activeSourceLogs.length > 0 ? activeSourceLogs : filteredLogs.map((l) => l.id),
        customStartDate: selectedPeriod === 'custom' ? customStart : undefined,
        customEndDate: selectedPeriod === 'custom' ? customEnd : undefined,
        modelUsed: generatedModelUsed || 'gemini-3.6-flash',
        totalLatencyMs: generatedLatencyMs || undefined,
      });

      setSaveSuccess(
        `Sprint summary successfully saved to Firestore at /users/${currentUser.uid.slice(0, 6)}.../sprintSummaries/${summaryId.slice(0, 10)}...`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save sprint summary to Firestore');
    } finally {
      setSaving(false);
    }
  };

  // Delete saved summary
  const handleDeleteSummary = async (summaryId: string) => {
    if (!currentUser) return;
    try {
      await deleteSprintSummaryRecord(currentUser.uid, summaryId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete sprint summary');
    }
  };

  // Copy past saved summary
  const handleCopySaved = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setSaveSuccess(`Copied sprint report #${id.slice(-6)} to clipboard!`);
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mission Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Sprint Summary Generator
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                TASK 4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
              Synthesize your recent owner-bound Engineering Logs, Career Achievements, and Daily Standups into an executive sprint review report complete with Major Deliverables, Technical Achievements, Business Impact, Challenges, Lessons Learned, Areas of Growth, and Next Priorities.
            </p>
          </div>

          {/* User Isolation Badge */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-[11px]">
              <div className="text-slate-400">ISOLATION SCOPE:</div>
              <div className="text-purple-300 font-bold">
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
              <div className="font-bold text-amber-300">Sign in to Access Your Sprint Data</div>
              <div className="text-slate-400">
                Your Engineering Logs, Standups, and Sprint Summaries are strictly isolated to your verified UID.
              </div>
            </div>
          </div>
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium font-mono transition-all shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {/* Control Bar: Time Window Selection, Custom Range & Sourced Counts */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Period Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-purple-400" />
              <span>Select Sprint Window:</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {(
                [
                  { id: '7d', label: 'Last 7 Days' },
                  { id: '14d', label: 'Last 14 Days' },
                  { id: '30d', label: 'Last 30 Days' },
                  { id: 'custom', label: 'Custom Date Range' },
                ] as const
              ).map((p) => {
                const isActive = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    id={`sprint-btn-${p.id}`}
                    onClick={() => setSelectedPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sourced Data Metrics */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Logs:</span>
              <span className="text-purple-300 font-bold">{filteredLogs.length}</span>
              <span className="text-slate-600">/ {engineeringLogs.length}</span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Achs:</span>
              <span className="text-amber-300 font-bold">{filteredAchievements.length}</span>
              <span className="text-slate-600">/ {achievements.length}</span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Standups:</span>
              <span className="text-indigo-300 font-bold">{filteredStandups.length}</span>
              <span className="text-slate-600">/ {standups.length}</span>
            </div>

            {/* Inspect Toggle */}
            <button
              onClick={() => setShowSourceInspection(!showSourceInspection)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              <span>{showSourceInspection ? 'Hide Inputs' : 'Inspect Inputs'}</span>
              {showSourceInspection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Fields */}
        {selectedPeriod === 'custom' && (
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Start Date:</span>
              <input
                id="input-custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">End Date:</span>
              <input
                id="input-custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-500">
              Filters all logs and standups recorded between these inclusive dates.
            </span>
          </div>
        )}

        {/* Expandable Preview of Selected Source Data */}
        {showSourceInspection && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3">
            <div className="text-[11px] font-mono text-slate-400">
              Sourced Items Feeding Sprint Report:
            </div>
            {filteredLogs.length === 0 && filteredStandups.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-lg border border-slate-900">
                No engineering logs or standups recorded within this time window.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {filteredLogs.map((l) => (
                  <div
                    key={l.id}
                    className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200 truncate">{l.title}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate font-sans">
                      {l.workPerformed}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generate Action Button */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            id="btn-generate-sprint-summary"
            onClick={() => handleGenerateSummary(false)}
            disabled={generating || !currentUser}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)]"
          >
            {generating ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Sprint Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Sprint Summary with Gemini</span>
              </>
            )}
          </button>

          {generating && (
            <span className="text-xs font-mono text-purple-400 flex items-center gap-2 animate-pulse">
              <span>&bull;</span>
              <span>{generationStatus || 'Synthesizing report...'}</span>
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
              <span>Sprint Summary Generation Error (Logs & Inputs Preserved)</span>
            </div>
            <button
              onClick={() => handleGenerateSummary(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700 text-[11px] transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry Generation</span>
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

      {/* Generated Sprint Report Display & Action Controls */}
      {generatedSummary && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Sprint Review Report
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {selectedPeriod.toUpperCase()} SPRINT
              </span>
            </div>

            {/* Telemetry */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              {generatedModelUsed && (
                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                  Model: {generatedModelUsed}
                </span>
              )}
              {generatedLatencyMs !== null && (
                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                  {generatedLatencyMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Fallback Synthesizer Notice */}
          {generationNotice && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl px-3.5 py-2 text-[11px] font-mono text-amber-300/90 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{generationNotice}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">
              8-Section Executive Sprint Hierarchy
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              {/* Copy Button */}
              <button
                id="btn-copy-sprint-summary"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              {/* Regenerate Button */}
              <button
                id="btn-regenerate-sprint-summary"
                onClick={() => handleGenerateSummary(false)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-400 ${generating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>

              {/* Save Button */}
              <button
                id="btn-save-sprint-summary"
                onClick={handleSaveSummary}
                disabled={saving || !currentUser}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Summary'}</span>
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-purple-500 selection:text-white">
            {generatedSummary}
          </div>
        </div>
      )}

      {/* Saved Sprint Summaries History */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Persisted Sprint Summaries
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {savedSummaries.length} saved
            </span>
          </div>
        </div>

        {savedSummaries.length === 0 ? (
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <div>No saved sprint summaries found in your Firestore namespace.</div>
            <div className="text-[11px] text-slate-500">
              Generate a sprint summary above and click &quot;Save Summary&quot; to archive your sprint reports.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {savedSummaries.map((sum) => (
              <div
                key={sum.id}
                className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 text-xs space-y-3 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                      Sprint: {sum.period}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(sum.generatedAt).toLocaleDateString()}{' '}
                      {new Date(sum.generatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sum.modelUsed && (
                      <span className="text-[10px] font-mono text-slate-500">
                        via {sum.modelUsed}
                      </span>
                    )}

                    <button
                      onClick={() => handleCopySaved(sum.summary, sum.id)}
                      title="Copy sprint summary"
                      className="text-slate-400 hover:text-purple-400 p-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSummary(sum.id)}
                      title="Delete sprint record from Firestore"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sum.sourceLogs && sum.sourceLogs.length > 0 && (
                  <div className="text-[10px] font-mono text-slate-500">
                    Synthesized from {sum.sourceLogs.length} engineering log(s)
                  </div>
                )}

                <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {sum.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
