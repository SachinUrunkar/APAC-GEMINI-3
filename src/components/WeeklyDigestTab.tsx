import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
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
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CalendarDays,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EngineeringLog,
  AchievementRecord,
  StandupRecord,
  SprintSummaryRecord,
  DashboardInsightRecord,
  WeeklyDigestRecord,
} from '../types';
import {
  subscribeUserEngineeringLogs,
  subscribeUserAchievements,
  subscribeUserStandups,
  subscribeUserSprintSummaries,
  subscribeUserDashboardInsights,
  saveWeeklyDigestRecord,
  deleteWeeklyDigestRecord,
  subscribeUserWeeklyDigests,
} from '../lib/firestoreService';

export const WeeklyDigestTab: React.FC = () => {
  const { currentUser, loginWithGoogle } = useAuth();

  // Period selection: '7d' | '14d' | 'custom'
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // User-isolated collections
  const [engineeringLogs, setEngineeringLogs] = useState<EngineeringLog[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [standups, setStandups] = useState<StandupRecord[]>([]);
  const [sprintSummaries, setSprintSummaries] = useState<SprintSummaryRecord[]>([]);
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsightRecord[]>([]);
  const [savedDigests, setSavedDigests] = useState<WeeklyDigestRecord[]>([]);

  // Generation & Active Digest state
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedDigest, setGeneratedDigest] = useState<string>('');
  const [generatedModelUsed, setGeneratedModelUsed] = useState<string | null>(null);
  const [generatedLatencyMs, setGeneratedLatencyMs] = useState<number | null>(null);
  const [activeSourceLogs, setActiveSourceLogs] = useState<string[]>([]);
  const [activeDigestId, setActiveDigestId] = useState<string | null>(null);

  // Email modal & delivery state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(currentUser?.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Actions & UI Feedback
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscriptions to current user's collections
  useEffect(() => {
    if (!currentUser) {
      setEngineeringLogs([]);
      setAchievements([]);
      setStandups([]);
      setSprintSummaries([]);
      setDashboardInsights([]);
      setSavedDigests([]);
      return;
    }

    if (currentUser.email) {
      setRecipientEmail(currentUser.email);
    }

    const unsubLogs = subscribeUserEngineeringLogs(
      currentUser.uid,
      (logs) => setEngineeringLogs(logs),
      (err) => console.warn('[Firestore] Digest logs sub error:', err.message)
    );

    const unsubAchs = subscribeUserAchievements(
      currentUser.uid,
      (achs) => setAchievements(achs),
      (err) => console.warn('[Firestore] Digest achs sub error:', err.message)
    );

    const unsubStandups = subscribeUserStandups(
      currentUser.uid,
      (st) => setStandups(st),
      (err) => console.warn('[Firestore] Digest standups sub error:', err.message)
    );

    const unsubSummaries = subscribeUserSprintSummaries(
      currentUser.uid,
      (sums) => setSprintSummaries(sums),
      (err) => console.warn('[Firestore] Digest summaries sub error:', err.message)
    );

    const unsubInsights = subscribeUserDashboardInsights(
      currentUser.uid,
      (ins) => setDashboardInsights(ins),
      (err) => console.warn('[Firestore] Digest insights sub error:', err.message)
    );

    const unsubDigests = subscribeUserWeeklyDigests(
      currentUser.uid,
      (digests) => setSavedDigests(digests),
      (err) => console.warn('[Firestore] Digest saved records sub error:', err.message)
    );

    return () => {
      unsubLogs();
      unsubAchs();
      unsubStandups();
      unsubSummaries();
      unsubInsights();
      unsubDigests();
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
    // custom
    const startMs = customStart ? new Date(customStart).getTime() : now - 7 * 24 * 60 * 60 * 1000;
    const endMs = customEnd ? new Date(customEnd).getTime() + 24 * 60 * 60 * 1000 - 1 : now;
    return { startMs, endMs };
  };

  const { startMs, endMs } = getTimeBounds();

  // Filter logs, achievements, standups, sprint summaries, and insights
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

  const filteredSummaries = sprintSummaries.filter((sum) => {
    const t = new Date(sum.generatedAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  // Generate Weekly Digest Handler
  const handleGenerateDigest = async () => {
    if (!currentUser) {
      setErrorMessage('Please sign in to generate and deliver your Weekly Achievement Digest.');
      return;
    }

    setGenerating(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setEmailSuccess(null);
    setGenerationStatus('Synthesizing executive weekly digest via Gemini fallback ladder...');

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/generate-weekly-digest', {
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
          sprintSummaryRecords: filteredSummaries,
          dashboardInsights,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setGeneratedDigest(data.content || '');
      setGeneratedModelUsed(data.usedModel || 'gemini-3.6-flash');
      setGeneratedLatencyMs(data.totalLatencyMs || 0);
      setActiveSourceLogs(data.sourceLogs || filteredLogs.map((l) => l.id));

      // Auto-save generated digest to Firestore
      try {
        const digestId = await saveWeeklyDigestRecord(currentUser.uid, {
          period:
            selectedPeriod === 'custom'
              ? `custom (${customStart} to ${customEnd})`
              : selectedPeriod,
          content: data.content || '',
          delivered: false,
          sourceLogs: data.sourceLogs || filteredLogs.map((l) => l.id),
          modelUsed: data.usedModel || 'gemini-3.6-flash',
          totalLatencyMs: data.totalLatencyMs || undefined,
          createdAt: new Date().toISOString(),
        });
        setActiveDigestId(digestId);
      } catch (saveErr: any) {
        console.warn('[Firestore] Weekly digest auto-save notice:', saveErr.message);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to generate weekly digest. You can retry with your preserved context.'
      );
    } finally {
      setGenerating(false);
      setGenerationStatus(null);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!generatedDigest) return;
    try {
      await navigator.clipboard.writeText(generatedDigest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = generatedDigest;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Save Digest to Firestore manually
  const handleSaveDigest = async () => {
    if (!currentUser || !generatedDigest) return;
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const digestId = await saveWeeklyDigestRecord(currentUser.uid, {
        id: activeDigestId || undefined,
        period:
          selectedPeriod === 'custom'
            ? `custom (${customStart} to ${customEnd})`
            : selectedPeriod,
        content: generatedDigest,
        delivered: false,
        sourceLogs: activeSourceLogs,
        modelUsed: generatedModelUsed || 'gemini-3.6-flash',
        totalLatencyMs: generatedLatencyMs || undefined,
        createdAt: new Date().toISOString(),
      });

      setActiveDigestId(digestId);
      setSaveSuccess(
        `Weekly digest saved to Firestore at /users/${currentUser.uid.slice(0, 6)}.../weeklyDigests/${digestId.slice(0, 10)}...`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save weekly digest to Firestore');
    } finally {
      setSaving(false);
    }
  };

  // Download Digest as Markdown (.md)
  const handleDownloadMarkdown = () => {
    if (!generatedDigest) return;
    const blob = new Blob([generatedDigest], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-engineering-digest-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Digest as PDF (Printable view)
  const handleDownloadPDF = () => {
    if (!generatedDigest) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Engineering Achievement Digest</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { color: #4f46e5; border-bottom: 2px solid #6366f1; padding-bottom: 8px; font-size: 24px; }
            .meta { font-family: monospace; color: #64748b; font-size: 12px; margin-bottom: 24px; }
            .content { font-family: monospace; white-space: pre-wrap; font-size: 13px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <h1>Weekly Engineering Achievement Digest</h1>
          <div class="meta">Period: ${selectedPeriod.toUpperCase()} &bull; Generated: ${new Date().toLocaleString()}</div>
          <div class="content">${generatedDigest}</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Send Email Handler
  const handleSendEmail = async (targetDigestId?: string, targetContent?: string) => {
    const digestContentToSend = targetContent || generatedDigest;
    const activeId = targetDigestId || activeDigestId;

    if (!currentUser) {
      setErrorMessage('Please sign in to email your Weekly Digest.');
      return;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Please enter a valid recipient email address.');
      return;
    }

    if (!digestContentToSend) {
      setErrorMessage('No digest content available to email.');
      return;
    }

    setSendingEmail(true);
    setErrorMessage(null);
    setEmailSuccess(null);
    setEmailStatus('Dispatching email via DevLog AI Cloud Transporter...');

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/send-digest-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          recipientEmail: recipientEmail.trim(),
          digestId: activeId || undefined,
          content: digestContentToSend,
          period: selectedPeriod,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Update or create Firestore WeeklyDigestRecord with delivery status
      const updatedId = await saveWeeklyDigestRecord(currentUser.uid, {
        id: activeId || undefined,
        period: selectedPeriod,
        content: digestContentToSend,
        delivered: data.delivered,
        deliveredAt: data.deliveredAt || new Date().toISOString(),
        deliveryError: data.delivered ? undefined : data.deliveryError,
        recipientEmail: recipientEmail.trim(),
        createdAt: new Date().toISOString(),
      });

      setActiveDigestId(updatedId);
      setEmailSuccess(
        `Weekly Digest successfully emailed to ${recipientEmail}! Delivery timestamp logged in Firestore.`
      );
      setShowEmailModal(false);
    } catch (err: any) {
      // Save delivery error to Firestore
      if (activeId) {
        try {
          await saveWeeklyDigestRecord(currentUser.uid, {
            id: activeId,
            period: selectedPeriod,
            content: digestContentToSend,
            delivered: false,
            deliveryError: err.message || 'Email delivery failed',
            recipientEmail: recipientEmail.trim(),
            createdAt: new Date().toISOString(),
          });
        } catch {
          // Absorb secondary save error
        }
      }
      setErrorMessage(`Email delivery failed: ${err.message}. You can retry delivery anytime.`);
    } finally {
      setSendingEmail(false);
      setEmailStatus(null);
    }
  };

  // Delete saved digest from Firestore
  const handleDeleteDigest = async (digestId: string) => {
    if (!currentUser) return;
    try {
      await deleteWeeklyDigestRecord(currentUser.uid, digestId);
      if (activeDigestId === digestId) {
        setActiveDigestId(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete weekly digest');
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
                <Mail className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Weekly Achievement Digest
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                EMAIL DELIVERY READY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
              Synthesize a 10-section executive weekly engineering summary from your logs, achievements, standups, sprint reviews, and career insights. View, copy, save, download as Markdown/PDF, or email directly with real-time delivery status tracking.
            </p>
          </div>

          {/* User Isolation Badge */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-[11px]">
              <div className="text-slate-400">EMAIL SCOPE:</div>
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
              <div className="font-bold text-amber-300">Sign in to Generate & Email Weekly Digests</div>
              <div className="text-slate-400">
                Your Weekly Achievement Digests and email delivery records are strictly isolated to your authenticated UID.
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

      {/* Control Bar: Time Window Selection & Sourced Metrics */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Period Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-indigo-400" />
              <span>Select Digest Time Window:</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {(
                [
                  { id: '7d', label: 'Last 7 Days (Weekly)' },
                  { id: '14d', label: 'Last 14 Days (Bi-Weekly)' },
                  { id: 'custom', label: 'Custom Date Range' },
                ] as const
              ).map((p) => {
                const isActive = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    id={`digest-period-${p.id}`}
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

          {/* Sourced Metrics Counter Badges */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Logs:</span>
              <span className="text-indigo-300 font-bold">{filteredLogs.length}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Achs:</span>
              <span className="text-amber-300 font-bold">{filteredAchievements.length}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Standups:</span>
              <span className="text-purple-300 font-bold">{filteredStandups.length}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Summaries:</span>
              <span className="text-emerald-300 font-bold">{filteredSummaries.length}</span>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {selectedPeriod === 'custom' && (
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Start Date:</span>
              <input
                id="input-digest-custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">End Date:</span>
              <input
                id="input-digest-custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            id="btn-generate-weekly-digest"
            onClick={handleGenerateDigest}
            disabled={generating || !currentUser}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.35)]"
          >
            {generating ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Weekly Digest...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Weekly Digest with Gemini</span>
              </>
            )}
          </button>

          {generating && (
            <span className="text-xs font-mono text-indigo-400 flex items-center gap-2 animate-pulse">
              <span>&bull;</span>
              <span>{generationStatus || 'Synthesizing 10-section report...'}</span>
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
              <span>Weekly Digest Process Notice</span>
            </div>
            <button
              onClick={handleGenerateDigest}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700 text-[11px] transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry Task</span>
            </button>
          </div>
          <p className="text-rose-200/80 text-[11px] font-sans pl-6">{errorMessage}</p>
        </div>
      )}

      {/* Success Notification Banners */}
      {saveSuccess && (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 text-xs font-mono flex items-center justify-between gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-slate-500 hover:text-slate-300 text-xs">
            &times;
          </button>
        </div>
      )}

      {emailSuccess && (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 text-xs font-mono flex items-center justify-between gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{emailSuccess}</span>
          </div>
          <button onClick={() => setEmailSuccess(null)} className="text-slate-500 hover:text-slate-300 text-xs">
            &times;
          </button>
        </div>
      )}

      {/* Generated Report Display & Multi-Action Control Bar */}
      {generatedDigest && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Weekly Engineering Digest Report
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                10-SECTION HIERARCHY
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

          {/* Action Bar (View, Copy, Save, Markdown, PDF, Email) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">
              Report Actions & Export Formats:
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {/* Copy */}
              <button
                id="btn-copy-digest"
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
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Save */}
              <button
                id="btn-save-digest"
                onClick={handleSaveDigest}
                disabled={saving || !currentUser}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-purple-400" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>

              {/* Download Markdown */}
              <button
                id="btn-download-md-digest"
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Markdown</span>
              </button>

              {/* Download PDF / Print */}
              <button
                id="btn-download-pdf-digest"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>PDF / Print</span>
              </button>

              {/* Email Digest */}
              <button
                id="btn-trigger-email-modal"
                onClick={() => setShowEmailModal(true)}
                disabled={!currentUser}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all shadow-[0_0_12px_rgba(79,70,229,0.35)]"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Digest</span>
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
            {generatedDigest}
          </div>
        </div>
      )}

      {/* Email Delivery Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Email Weekly Digest
                </h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-sans">
              <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                Recipient Email Address:
              </label>
              <input
                id="input-recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 font-mono">
                Verify recipient email. Delivery status and timestamp will be logged to your owner-bound Firestore record.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-send-email"
                onClick={() => handleSendEmail()}
                disabled={sendingEmail || !recipientEmail.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all shadow-[0_0_12px_rgba(79,70,229,0.3)]"
              >
                {sendingEmail ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persisted Digest History & Delivery Tracker */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Persisted Weekly Digests & Email Delivery Log
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {savedDigests.length} records
            </span>
          </div>
        </div>

        {savedDigests.length === 0 ? (
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
            <Mail className="w-8 h-8 text-slate-600 mx-auto" />
            <div>No saved weekly digests recorded in your Firestore namespace.</div>
            <div className="text-[11px] text-slate-500">
              Generate a Weekly Digest above and click "Save" or "Email Digest" to record your reports.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {savedDigests.map((dig) => (
              <div
                key={dig.id}
                className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 text-xs space-y-3 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                      Period: {dig.period}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(dig.createdAt).toLocaleDateString()}{' '}
                      {new Date(dig.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Delivery Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    {dig.delivered ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>DELIVERED {dig.deliveredAt ? `(${new Date(dig.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                      </span>
                    ) : dig.deliveryError ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>DELIVERY FAILED</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                        NOT SENT
                      </span>
                    )}

                    {/* Retry Button if failed or not sent */}
                    {(!dig.delivered || dig.deliveryError) && (
                      <button
                        onClick={() => handleSendEmail(dig.id, dig.content)}
                        disabled={sendingEmail}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white font-mono text-[10px] transition-colors"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Retry Delivery</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteDigest(dig.id)}
                      title="Delete digest record from Firestore"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {dig.recipientEmail && (
                  <div className="text-[10px] font-mono text-slate-400">
                    Recipient: <span className="text-slate-300 font-bold">{dig.recipientEmail}</span>
                  </div>
                )}

                <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {dig.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
