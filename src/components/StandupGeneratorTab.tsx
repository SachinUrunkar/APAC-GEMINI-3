import React, { useState, useEffect } from 'react';
import {
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
  FileText,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EngineeringLog,
  AchievementRecord,
  StandupRecord,
  StandupPeriod,
} from '../types';
import {
  subscribeUserEngineeringLogs,
  subscribeUserAchievements,
  saveStandupRecord,
  deleteStandupRecord,
  subscribeUserStandups,
} from '../lib/firestoreService';

export const StandupGeneratorTab: React.FC = () => {
  const { currentUser, firestoreConnected, loginWithGoogle } = useAuth();

  // Period Selection
  const [selectedPeriod, setSelectedPeriod] = useState<StandupPeriod>('24h');

  // Stored state from Firestore (owner-bound to currentUser.uid)
  const [engineeringLogs, setEngineeringLogs] = useState<EngineeringLog[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [savedStandups, setSavedStandups] = useState<StandupRecord[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedModelUsed, setGeneratedModelUsed] = useState<string | null>(null);
  const [generatedLatencyMs, setGeneratedLatencyMs] = useState<number | null>(null);
  const [activeSourceLogs, setActiveSourceLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [showLogPreview, setShowLogPreview] = useState(false);

  // Subscriptions to current user's owner-bound subcollections
  useEffect(() => {
    if (!currentUser) {
      setEngineeringLogs([]);
      setAchievements([]);
      setSavedStandups([]);
      return;
    }

    const unsubLogs = subscribeUserEngineeringLogs(
      currentUser.uid,
      (logs) => setEngineeringLogs(logs),
      (err) => console.warn('[Firestore] Standup logs sub error:', err.message)
    );

    const unsubAchs = subscribeUserAchievements(
      currentUser.uid,
      (achs) => setAchievements(achs),
      (err) => console.warn('[Firestore] Standup achs sub error:', err.message)
    );

    const unsubStandups = subscribeUserStandups(
      currentUser.uid,
      (standups) => setSavedStandups(standups),
      (err) => console.warn('[Firestore] Standups sub error:', err.message)
    );

    return () => {
      unsubLogs();
      unsubAchs();
      unsubStandups();
    };
  }, [currentUser]);

  // Compute time cutoff based on selected period
  const getCutoffMs = (period: StandupPeriod): number => {
    switch (period) {
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '3d':
        return 3 * 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  };

  const nowMs = Date.now();
  const cutoffLimit = nowMs - getCutoffMs(selectedPeriod);

  // Filter logs and achievements belonging strictly to the authenticated user within selected period
  const filteredLogs = engineeringLogs.filter((log) => {
    const logTime = new Date(log.createdAt).getTime();
    return !isNaN(logTime) && logTime >= cutoffLimit;
  });

  const filteredAchievements = achievements.filter((ach) => {
    const achTime = new Date(ach.createdAt).getTime();
    return !isNaN(achTime) && achTime >= cutoffLimit;
  });

  // Generate Standup handler
  const handleGenerateStandup = async (isRetry = false) => {
    if (!currentUser) {
      setErrorMessage('Please sign in to generate and persist your standup update.');
      return;
    }

    setGenerating(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setGenerationStatus('Querying Gemini model fallback ladder (gemini-3.6-flash)...');

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/generate-standup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          period: selectedPeriod,
          engineeringLogs: filteredLogs,
          achievementRecords: filteredAchievements,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setGeneratedContent(data.content || '');
      setGeneratedModelUsed(data.usedModel || 'gemini-3.6-flash');
      setGeneratedLatencyMs(data.totalLatencyMs || 0);
      setActiveSourceLogs(data.sourceLogs || filteredLogs.map((l) => l.id));

      if (data.notice) {
        setGenerationNotice(data.notice);
      } else {
        setGenerationNotice(null);
      }
    } catch (err: any) {
      console.warn('[Standup Generation Notice]:', err.message);
      setErrorMessage(
        err.message || 'Failed to generate standup update. You can retry with the current logs.'
      );
    } finally {
      setGenerating(false);
      setGenerationStatus(null);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted in iframe
      const textArea = document.createElement('textarea');
      textArea.value = generatedContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Save generated standup to Firestore
  const handleSaveStandup = async () => {
    if (!currentUser || !generatedContent) return;
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const standupId = await saveStandupRecord(currentUser.uid, {
        period: selectedPeriod,
        content: generatedContent,
        generatedAt: new Date().toISOString(),
        sourceLogs: activeSourceLogs.length > 0 ? activeSourceLogs : filteredLogs.map((l) => l.id),
        modelUsed: generatedModelUsed || 'gemini-3.6-flash',
        totalLatencyMs: generatedLatencyMs || undefined,
      });

      setSaveSuccess(
        `Standup successfully saved to Firestore at /users/${currentUser.uid.slice(0, 6)}.../standups/${standupId.slice(0, 10)}...`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save standup to Firestore');
    } finally {
      setSaving(false);
    }
  };

  // Delete saved standup
  const handleDeleteStandup = async (standupId: string) => {
    if (!currentUser) return;
    try {
      await deleteStandupRecord(currentUser.uid, standupId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete standup record');
    }
  };

  // Copy previous saved standup
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
    setSaveSuccess(`Copied standup record #${id.slice(-6)} to clipboard!`);
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mission Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Calendar className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                AI Standup Generator
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                TASK 3
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
              Synthesize your recent owner-bound Engineering Logs and Extracted Career Achievements into an executive, high-signal engineering standup report formatted in Yesterday, Today, Blockers, and Achievements.
            </p>
          </div>

          {/* User Isolation Badge */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-[11px]">
              <div className="text-slate-400">ISOLATION SCOPE:</div>
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
              <div className="font-bold text-amber-300">Sign in to Access Your Career Logs</div>
              <div className="text-slate-400">
                Your Engineering Logs and Standup Records are strictly isolated to your verified UID.
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

      {/* Control Bar: Time Window Selection & Source Metrics */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Period Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>Select Activity Period:</span>
            </label>
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {(
                [
                  { id: '24h', label: 'Last 24 Hours' },
                  { id: '3d', label: 'Last 3 Days' },
                  { id: '7d', label: 'Last 7 Days' },
                ] as const
              ).map((p) => {
                const isActive = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    id={`period-btn-${p.id}`}
                    onClick={() => setSelectedPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.35)] font-bold'
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
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Engineering Logs:</span>
              <span className="text-indigo-300 font-bold">{filteredLogs.length}</span>
              <span className="text-slate-600">/ {engineeringLogs.length} total</span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Achievements:</span>
              <span className="text-amber-300 font-bold">{filteredAchievements.length}</span>
              <span className="text-slate-600">/ {achievements.length} total</span>
            </div>

            {/* Inspect Source Logs Toggle */}
            <button
              onClick={() => setShowLogPreview(!showLogPreview)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              <span>{showLogPreview ? 'Hide Sourced Logs' : 'Inspect Sourced Logs'}</span>
              {showLogPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Expandable Preview of Selected Source Logs */}
        {showLogPreview && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-slate-400">
              Logs Included for &quot;{selectedPeriod === '24h' ? 'Last 24 Hours' : selectedPeriod === '3d' ? 'Last 3 Days' : 'Last 7 Days'}&quot;:
            </div>
            {filteredLogs.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-lg border border-slate-900">
                No logs recorded within this time window. Add an Engineering Log in the &quot;Engineering Logs&quot; tab to enrich your standup.
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

        {/* Generate CTA Button */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            id="btn-generate-standup"
            onClick={() => handleGenerateStandup(false)}
            disabled={generating || !currentUser}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.35)]"
          >
            {generating ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Standup...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Standup with Gemini</span>
              </>
            )}
          </button>

          {generating && (
            <span className="text-xs font-mono text-indigo-400 flex items-center gap-2 animate-pulse">
              <span>&bull;</span>
              <span>{generationStatus || 'Running fallback ladder...'}</span>
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
              <span>Standup Generation Error (State & Logs Preserved)</span>
            </div>
            <button
              onClick={() => handleGenerateStandup(true)}
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

      {/* Generated Standup Display & Actions */}
      {generatedContent && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          {/* Card Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Generated Standup Report
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {selectedPeriod.toUpperCase()} WINDOW
              </span>
            </div>

            {/* Model & Latency Telemetry */}
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

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">
              Format: Yesterday &bull; Today &bull; Blockers &bull; Achievements
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              {/* Copy Button */}
              <button
                id="btn-copy-standup"
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
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              {/* Regenerate Button */}
              <button
                id="btn-regenerate-standup"
                onClick={() => handleGenerateStandup(false)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-indigo-400 ${generating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>

              {/* Save Button */}
              <button
                id="btn-save-standup"
                onClick={handleSaveStandup}
                disabled={saving || !currentUser}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all shadow-[0_0_10px_rgba(79,70,229,0.3)]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save to Firestore'}</span>
              </button>
            </div>
          </div>

          {/* Standup Content Box */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
            {generatedContent}
          </div>
        </div>
      )}

      {/* Saved Standups History Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Persisted Standup History
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {savedStandups.length} saved
            </span>
          </div>
        </div>

        {savedStandups.length === 0 ? (
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <div>No saved standups found in your Firestore namespace.</div>
            <div className="text-[11px] text-slate-500">
              Generate a standup above and click &quot;Save to Firestore&quot; to preserve your daily updates.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {savedStandups.map((standup) => (
              <div
                key={standup.id}
                className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 text-xs space-y-3 hover:border-slate-700 transition-colors shadow-sm"
              >
                {/* Standup Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                      Period: {standup.period}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(standup.generatedAt).toLocaleDateString()}{' '}
                      {new Date(standup.generatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {standup.modelUsed && (
                      <span className="text-[10px] font-mono text-slate-500">
                        via {standup.modelUsed}
                      </span>
                    )}

                    {/* Copy Saved Button */}
                    <button
                      onClick={() => handleCopySaved(standup.content, standup.id)}
                      title="Copy standup text"
                      className="text-slate-400 hover:text-indigo-400 p-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Saved Button */}
                    <button
                      onClick={() => handleDeleteStandup(standup.id)}
                      title="Delete standup record from Firestore"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sourced Logs Footnote */}
                {standup.sourceLogs && standup.sourceLogs.length > 0 && (
                  <div className="text-[10px] font-mono text-slate-500">
                    Synthesized from {standup.sourceLogs.length} engineering log(s)
                  </div>
                )}

                {/* Content */}
                <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {standup.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
