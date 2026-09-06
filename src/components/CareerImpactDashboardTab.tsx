import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Briefcase,
  Award,
  Calendar,
  FileText,
  BrainCircuit,
  RotateCw,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Flame,
  Star,
  Target,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EngineeringLog,
  AchievementRecord,
  StandupRecord,
  SprintSummaryRecord,
  MemoryQueryRecord,
  DashboardInsightRecord,
} from '../types';
import {
  subscribeUserEngineeringLogs,
  subscribeUserAchievements,
  subscribeUserStandups,
  subscribeUserSprintSummaries,
  subscribeUserMemoryQueries,
  subscribeUserDashboardInsights,
  saveDashboardInsightRecord,
} from '../lib/firestoreService';

export const CareerImpactDashboardTab: React.FC = () => {
  const { currentUser, loginWithGoogle } = useAuth();

  // User-isolated state
  const [engineeringLogs, setEngineeringLogs] = useState<EngineeringLog[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [standups, setStandups] = useState<StandupRecord[]>([]);
  const [sprintSummaries, setSprintSummaries] = useState<SprintSummaryRecord[]>([]);
  const [memoryQueries, setMemoryQueries] = useState<MemoryQueryRecord[]>([]);
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsightRecord[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Active AI Insight
  const latestInsight = dashboardInsights.length > 0 ? dashboardInsights[0] : null;

  // Real-time Subscriptions
  useEffect(() => {
    if (!currentUser) {
      setEngineeringLogs([]);
      setAchievements([]);
      setStandups([]);
      setSprintSummaries([]);
      setMemoryQueries([]);
      setDashboardInsights([]);
      return;
    }

    const unsubLogs = subscribeUserEngineeringLogs(
      currentUser.uid,
      (logs) => setEngineeringLogs(logs),
      (err) => console.warn('[Firestore] Dashboard logs sub error:', err.message)
    );

    const unsubAchs = subscribeUserAchievements(
      currentUser.uid,
      (achs) => setAchievements(achs),
      (err) => console.warn('[Firestore] Dashboard achs sub error:', err.message)
    );

    const unsubStandups = subscribeUserStandups(
      currentUser.uid,
      (st) => setStandups(st),
      (err) => console.warn('[Firestore] Dashboard standups sub error:', err.message)
    );

    const unsubSummaries = subscribeUserSprintSummaries(
      currentUser.uid,
      (sums) => setSprintSummaries(sums),
      (err) => console.warn('[Firestore] Dashboard summaries sub error:', err.message)
    );

    const unsubQueries = subscribeUserMemoryQueries(
      currentUser.uid,
      (queries) => setMemoryQueries(queries),
      (err) => console.warn('[Firestore] Dashboard queries sub error:', err.message)
    );

    const unsubInsights = subscribeUserDashboardInsights(
      currentUser.uid,
      (insights) => setDashboardInsights(insights),
      (err) => console.warn('[Firestore] Dashboard insights sub error:', err.message)
    );

    return () => {
      unsubLogs();
      unsubAchs();
      unsubStandups();
      unsubSummaries();
      unsubQueries();
      unsubInsights();
    };
  }, [currentUser]);

  // 1. Achievement Category Analytics Computation
  const achievementCategoryCounts = useMemo(() => {
    const categories = [
      'Technical Impact',
      'Business Impact',
      'Leadership Signals',
      'Ownership Signals',
      'Cross-Team Collaboration Signals',
      'Innovation Signals',
      'Problem Solving Signals',
    ];

    const counts: Record<string, number> = {};
    categories.forEach((cat) => (counts[cat] = 0));

    achievements.forEach((ach) => {
      if (counts[ach.category] !== undefined) {
        counts[ach.category]++;
      } else {
        // Fallback fuzzy matching
        const catKey = categories.find((c) => ach.category && ach.category.includes(c.split(' ')[0]));
        if (catKey) counts[catKey]++;
        else counts['Technical Impact']++;
      }
    });

    return counts;
  }, [achievements]);

  // 2. Technology Usage Analytics Computation
  const technologyFrequency = useMemo(() => {
    const freq: Record<string, number> = {};

    engineeringLogs.forEach((log) => {
      const techList = Array.isArray(log.technologiesUsed)
        ? log.technologiesUsed
        : typeof log.technologiesUsed === 'string'
        ? (log.technologiesUsed as string).split(',').map((s) => s.trim())
        : [];

      techList.forEach((tech) => {
        const clean = tech.trim();
        if (clean) {
          // Normalize capitalization (e.g. React.js -> React)
          const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
          freq[capitalized] = (freq[capitalized] || 0) + 1;
        }
      });
    });

    // Sort descending by frequency
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [engineeringLogs]);

  // 3. Weekly Trend Analysis Computation (Past 6 Weeks)
  const weeklyTrends = useMemo(() => {
    const weeks: { weekLabel: string; startMs: number; endMs: number; logs: number; achs: number; summaries: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekLabel = `W${6 - i} (${start.toLocaleDateString([], { month: 'numeric', day: 'numeric' })})`;

      const logsCount = engineeringLogs.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }).length;

      const achsCount = achievements.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }).length;

      const summariesCount = sprintSummaries.filter((s) => {
        const t = new Date(s.generatedAt || s.createdAt || Date.now()).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }).length;

      weeks.push({
        weekLabel,
        startMs: start.getTime(),
        endMs: end.getTime(),
        logs: logsCount,
        achs: achsCount,
        summaries: summariesCount,
      });
    }

    return weeks;
  }, [engineeringLogs, achievements, sprintSummaries]);

  // Refresh AI Dashboard Growth Insights Handler
  const handleRefreshDashboardInsights = async () => {
    if (!currentUser) {
      setErrorMessage('Please sign in to generate and refresh your AI Career Impact Insights.');
      return;
    }

    setGenerating(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setGenerationStatus('Synthesizing growth insights & career trajectory via Gemini...');

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/generate-dashboard-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          engineeringLogs,
          achievementRecords: achievements,
          standupRecords: standups,
          sprintSummaryRecords: sprintSummaries,
          memoryQueries,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Persist generated insight record in Firestore
      const savedId = await saveDashboardInsightRecord(currentUser.uid, {
        generatedAt: new Date().toISOString(),
        strengths: data.strengths || [],
        growthAreas: data.growthAreas || [],
        emergingSkills: data.emergingSkills || [],
        leadershipSignals: data.leadershipSignals || [],
        modelUsed: data.usedModel || 'gemini-3.6-flash',
        totalLatencyMs: data.totalLatencyMs,
        createdAt: new Date().toISOString(),
      });

      setSaveSuccess(`Dashboard Insights updated and saved to Firestore (#${savedId.slice(-6)})!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to refresh dashboard insights.');
    } finally {
      setGenerating(false);
      setGenerationStatus(null);
    }
  };

  const isNewUser =
    engineeringLogs.length === 0 &&
    achievements.length === 0 &&
    standups.length === 0 &&
    sprintSummaries.length === 0;

  return (
    <div className="space-y-6">
      {/* Header & Mission Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Career Impact Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                VISUAL ANALYTICS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
              Transform stored Engineering Logs, Career Achievements, Standups, Sprint Summaries, and Work History queries into real-time metrics, category breakdowns, technology usage frequency, weekly trends, and AI Growth Insights.
            </p>
          </div>

          {/* Action & Scope */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-refresh-dashboard"
              onClick={handleRefreshDashboardInsights}
              disabled={generating || !currentUser}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {generating ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Refresh Dashboard</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px]">
                <div className="text-slate-400">SCOPE:</div>
                <div className="text-emerald-300 font-bold">
                  {currentUser ? `uid: ${currentUser.uid.slice(0, 8)}...` : 'Unauthenticated'}
                </div>
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
              <div className="font-bold text-amber-300">Sign in to Access Your Career Dashboard</div>
              <div className="text-slate-400">
                Dashboard analytics and growth insights are computed exclusively from your authenticated UID namespace.
              </div>
            </div>
          </div>
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium font-mono transition-all shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {/* Friendly Empty-State UX for New Users */}
      {isNewUser && currentUser && (
        <div className="bg-[#161B22] border border-indigo-500/30 rounded-2xl p-8 text-center space-y-4 shadow-lg relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-white">Welcome to Your Career Impact Dashboard!</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              You haven't recorded any engineering work logs yet. Record your first engineering log in the <strong>Engineering Logs</strong> tab to automatically unlock achievement extraction, technology frequency analytics, and AI growth insights!
            </p>
          </div>
        </div>
      )}

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-4 text-xs font-mono flex items-center justify-between text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 text-xs font-mono flex items-center justify-between text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        </div>
      )}

      {/* 2. Overview KPI Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Engineering Logs */}
        <div className="p-4 bg-[#161B22] border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Work Logs
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {engineeringLogs.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Recorded Work Items</div>
        </div>

        {/* Total Achievements Extracted */}
        <div className="p-4 bg-[#161B22] border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Achievements
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {achievements.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Career Signals Extracted</div>
        </div>

        {/* Total Standups Generated */}
        <div className="p-4 bg-[#161B22] border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Standups
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-300 tracking-tight">
            {standups.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Daily Updates Synthesized</div>
        </div>

        {/* Total Sprint Summaries Generated */}
        <div className="p-4 bg-[#161B22] border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Sprint Reports
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {sprintSummaries.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Executive Reviews</div>
        </div>

        {/* Total AI Queries Asked */}
        <div className="p-4 bg-[#161B22] border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              AI Queries
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BrainCircuit className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300 tracking-tight">
            {memoryQueries.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Work History Queries</div>
        </div>
      </div>

      {/* Analytics Main Section: Category Breakdown & Technology Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Achievement Analytics (Category Distribution) */}
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Achievement Signal Breakdown
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {achievements.length} Total Records
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {Object.entries(achievementCategoryCounts).map(([cat, count]) => {
              const total = achievements.length || 1;
              const pct = Math.round((count / total) * 100);

              const colorMap: Record<string, string> = {
                'Technical Impact': 'bg-indigo-500 text-indigo-400',
                'Business Impact': 'bg-emerald-500 text-emerald-400',
                'Leadership Signals': 'bg-purple-500 text-purple-400',
                'Ownership Signals': 'bg-cyan-500 text-cyan-400',
                'Cross-Team Collaboration Signals': 'bg-sky-500 text-sky-400',
                'Innovation Signals': 'bg-amber-500 text-amber-400',
                'Problem Solving Signals': 'bg-rose-500 text-rose-400',
              };

              const activeColor = colorMap[cat] || 'bg-indigo-500 text-indigo-400';
              const bgBar = activeColor.split(' ')[0];
              const textCls = activeColor.split(' ')[1];

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 truncate max-w-[240px]">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${textCls}`}>{count}</span>
                      <span className="text-slate-500 text-[10px]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div
                      className={`h-full ${bgBar} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Technology Usage Analytics */}
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Technology Usage Frequency
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Top Technologies Sourced
            </span>
          </div>

          {technologyFrequency.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-6 text-center font-mono">
              No technology tags found across engineering logs yet. Record technologies when logging work entries to view frequency stats.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex flex-wrap gap-2 pb-2">
                {technologyFrequency.map(([tech, freq]) => (
                  <div
                    key={tech}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2"
                  >
                    <span className="font-bold text-slate-200">{tech}</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                      {freq}x
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Ranked Usage Intensity:
                </div>
                {technologyFrequency.slice(0, 5).map(([tech, freq], idx) => {
                  const maxFreq = technologyFrequency[0][1] || 1;
                  const pct = Math.round((freq / maxFreq) * 100);

                  return (
                    <div key={tech} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="text-slate-500 font-bold">#{idx + 1}</span>
                          <span>{tech}</span>
                        </span>
                        <span className="text-indigo-400 font-bold">{freq} log entries</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Impact Trend Analysis (Weekly Activity Rhythms) */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Impact Trend Analysis (Past 6 Weeks)
            </h2>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
              <span>Work Logs</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
              <span>Achievements</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
              <span>Sprint Summaries</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 font-mono text-xs">
          {weeklyTrends.map((wt, idx) => {
            const maxVal = Math.max(
              ...weeklyTrends.map((w) => Math.max(w.logs, w.achs, w.summaries, 1))
            );

            return (
              <div
                key={idx}
                className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-3 flex flex-col justify-between"
              >
                <div className="text-[10px] font-bold text-slate-400 text-center border-b border-slate-900 pb-1">
                  {wt.weekLabel}
                </div>

                {/* Bars Container */}
                <div className="flex items-end justify-center gap-1.5 h-24 pt-2">
                  {/* Logs Bar */}
                  <div
                    className="w-3 bg-indigo-500 rounded-t transition-all"
                    style={{ height: `${Math.max((wt.logs / maxVal) * 100, wt.logs > 0 ? 10 : 4)}%` }}
                    title={`${wt.logs} Logs`}
                  />
                  {/* Achs Bar */}
                  <div
                    className="w-3 bg-amber-500 rounded-t transition-all"
                    style={{ height: `${Math.max((wt.achs / maxVal) * 100, wt.achs > 0 ? 10 : 4)}%` }}
                    title={`${wt.achs} Achievements`}
                  />
                  {/* Summaries Bar */}
                  <div
                    className="w-3 bg-emerald-500 rounded-t transition-all"
                    style={{ height: `${Math.max((wt.summaries / maxVal) * 100, wt.summaries > 0 ? 10 : 4)}%` }}
                    title={`${wt.summaries} Summaries`}
                  />
                </div>

                {/* Legend Values */}
                <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400 border-t border-slate-900">
                  <span className="text-indigo-400 font-bold">{wt.logs}l</span>
                  <span className="text-amber-400 font-bold">{wt.achs}a</span>
                  <span className="text-emerald-400 font-bold">{wt.summaries}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. AI Growth Insights Section */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                AI Growth Insights & Executive Career Signals
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Synthesized by Gemini from your work history, engineering logs, and achievement records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            {latestInsight?.modelUsed && (
              <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                via {latestInsight.modelUsed}
              </span>
            )}
            {latestInsight?.generatedAt && (
              <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400">
                {new Date(latestInsight.generatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Growth Insights 4-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strength Areas */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>Core Strengths</span>
            </div>
            <ul className="space-y-1.5 text-xs font-sans text-slate-300">
              {(latestInsight?.strengths.length ? latestInsight.strengths : [
                'Demonstrated delivery across technical implementation tasks',
                'Zero-crash payload hygiene and owner-bound security focus',
                'Structured engineering logging and milestone tracking',
              ]).map((str, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold font-mono">•</span>
                  <span className="leading-relaxed">{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Emerging Skills */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Emerging Skills</span>
            </div>
            <ul className="space-y-1.5 text-xs font-sans text-slate-300">
              {(latestInsight?.emergingSkills.length ? latestInsight.emergingSkills : [
                'TypeScript & Vite client application bundling',
                'Firestore owner-bound security rule modeling',
                'Google GenAI SDK & resilient fallback ladders',
              ]).map((sk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold font-mono">•</span>
                  <span className="leading-relaxed">{sk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Leadership Signals */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
              <Star className="w-4 h-4 text-purple-400" />
              <span>Leadership Signals</span>
            </div>
            <ul className="space-y-1.5 text-xs font-sans text-slate-300">
              {(latestInsight?.leadershipSignals.length ? latestInsight.leadershipSignals : [
                'Proactive end-to-end initiative on key modules',
                'Architectural threat modeling across 5 critical zones',
                'Consistent daily standups and sprint retrospectives',
              ]).map((ls, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold font-mono">•</span>
                  <span className="leading-relaxed">{ls}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested Growth Areas */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Suggested Growth Areas</span>
            </div>
            <ul className="space-y-1.5 text-xs font-sans text-slate-300">
              {(latestInsight?.growthAreas.length ? latestInsight.growthAreas : [
                'Expand automated end-to-end contract verification suites',
                'Document high-level architectural decision records (ADRs)',
                'Increase cross-team API contract alignment',
              ]).map((ga, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold font-mono">•</span>
                  <span className="leading-relaxed">{ga}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
