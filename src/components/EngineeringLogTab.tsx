import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Code2,
  BookOpen,
  Tag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Database,
  Lock,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Award,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { EngineeringLog, JournalEntry, WorkLogEntry, AchievementRecord, AchievementCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  saveEngineeringLog,
  deleteEngineeringLog,
  subscribeUserEngineeringLogs,
  saveJournalEntry,
  deleteJournalEntry,
  subscribeUserJournalEntries,
  saveBatchAchievements,
  deleteAchievementRecord,
  subscribeUserAchievements,
} from '../lib/firestoreService';
import { AchievementCard } from './AchievementCard';

const SUGGESTED_TECH = [
  'TypeScript',
  'Cloud Run',
  'Secret Manager',
  'Firestore',
  'Gemini 3.6 Flash',
  'Docker',
  'Tailwind CSS',
  'React 19',
  'Node.js / Express',
  'OWASP Top 10',
];

export const EngineeringLogTab: React.FC = () => {
  const { currentUser, firestoreConnected, loginWithGoogle } = useAuth();

  // Mode: 'engineering_log' | 'journal_entry'
  const [entryType, setEntryType] = useState<'engineering_log' | 'journal_entry'>('engineering_log');

  // Engineering Log fields
  const [title, setTitle] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [challengesEncountered, setChallengesEncountered] = useState('');
  const [learnings, setLearnings] = useState('');
  const [techInput, setTechInput] = useState('');
  const [technologiesUsed, setTechnologiesUsed] = useState<string[]>(['TypeScript', 'Cloud Run', 'Firestore']);
  const [impactOutcome, setImpactOutcome] = useState('');

  // Baseline Journal Entry fields
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');

  // State management
  const [submitting, setSubmitting] = useState(false);
  const [extractingLogId, setExtractingLogId] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live stored entries & achievements
  const [engineeringLogs, setEngineeringLogs] = useState<EngineeringLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [filterView, setFilterView] = useState<'all' | 'engineering' | 'journal' | 'achievements'>('all');
  const [achievementCategoryFilter, setAchievementCategoryFilter] = useState<string>('all');
  const [achievementImpactFilter, setAchievementImpactFilter] = useState<string>('all');

  // Subscriptions to user's owner-bound Firestore subcollections
  useEffect(() => {
    if (!currentUser) {
      setEngineeringLogs([]);
      setJournalEntries([]);
      setAchievements([]);
      return;
    }

    const unsubEng = subscribeUserEngineeringLogs(
      currentUser.uid,
      (logs) => setEngineeringLogs(logs),
      (err) => console.warn('[Firestore] Eng logs sub error:', err.message)
    );

    const unsubJrnl = subscribeUserJournalEntries(
      currentUser.uid,
      (entries) => setJournalEntries(entries),
      (err) => console.warn('[Firestore] Jrnl sub error:', err.message)
    );

    const unsubAch = subscribeUserAchievements(
      currentUser.uid,
      (achs) => setAchievements(achs),
      (err) => console.warn('[Firestore] Achievements sub error:', err.message)
    );

    return () => {
      unsubEng();
      unsubJrnl();
      unsubAch();
    };
  }, [currentUser]);

  // Tech tags management
  const addTechTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !technologiesUsed.includes(trimmed)) {
      setTechnologiesUsed([...technologiesUsed, trimmed]);
    }
    setTechInput('');
  };

  const removeTechTag = (tagToRemove: string) => {
    setTechnologiesUsed(technologiesUsed.filter((t) => t !== tagToRemove));
  };

  const handleTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTechTag(techInput);
    }
  };

  // AI Achievement Extraction Engine invocation
  const extractAchievementsForLog = async (log: EngineeringLog, isAutomatic = true) => {
    if (!currentUser) return;
    setExtractingLogId(log.id);
    setExtractionStatus(`Analyzing "${log.title.slice(0, 32)}..." with Gemini model ladder...`);

    try {
      let idToken = 'mock_dev_token';
      try {
        idToken = await currentUser.getIdToken();
      } catch {
        idToken = `test_${currentUser.uid}`;
      }

      const response = await fetch('/api/extract-achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          engineeringLog: log,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.achievements) && data.achievements.length > 0) {
        await saveBatchAchievements(currentUser.uid, data.achievements);
        setSuccessMessage(
          `Log saved & ${data.achievements.length} career achievement signals extracted via ${data.usedModel} (${data.totalLatencyMs}ms)!`
        );
      } else {
        setSuccessMessage(`Log saved to Firestore. No explicit career signals extracted for this entry.`);
      }
    } catch (err: any) {
      console.warn('Achievement extraction notice:', err.message);
      if (!isAutomatic) {
        setErrorMessage(`Achievement extraction error: ${err.message}`);
      } else {
        setSuccessMessage((prev) => `${prev || 'Log saved.'} (AI extraction note: ${err.message})`);
      }
    } finally {
      setExtractingLogId(null);
      setExtractionStatus(null);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      setErrorMessage('Please sign in via the header or Google button to persist entries under your authenticated namespace.');
      return;
    }

    setSubmitting(true);

    try {
      if (entryType === 'engineering_log') {
        if (!title.trim() || !workPerformed.trim()) {
          throw new Error('Title and Work Performed are required fields.');
        }

        const newLogPayload = {
          entryType: 'engineering_log' as const,
          title: title.trim(),
          workPerformed: workPerformed.trim(),
          challengesEncountered: challengesEncountered.trim(),
          learnings: learnings.trim(),
          technologiesUsed,
          impactOutcome: impactOutcome.trim(),
          createdAt: new Date().toISOString(),
        };

        const logId = await saveEngineeringLog(currentUser.uid, newLogPayload);

        // Reset form
        setTitle('');
        setWorkPerformed('');
        setChallengesEncountered('');
        setLearnings('');
        setImpactOutcome('');

        // Automatically trigger AI Achievement Extraction Engine
        await extractAchievementsForLog({
          ...newLogPayload,
          id: logId,
          userId: currentUser.uid,
        }, true);
      } else {
        if (!journalTitle.trim() || !journalContent.trim()) {
          throw new Error('Title and Journal Content are required.');
        }

        const entryId = await saveJournalEntry(currentUser.uid, {
          entryType: 'journal_entry',
          title: journalTitle.trim(),
          content: journalContent.trim(),
          createdAt: new Date().toISOString(),
        });

        setSuccessMessage(`Journal Entry persisted to /users/${currentUser.uid.slice(0, 6)}.../journalEntries/${entryId}`);
        setJournalTitle('');
        setJournalContent('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteEngineeringLog(currentUser.uid, id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete engineering log');
    }
  };

  const handleDeleteJournal = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteJournalEntry(currentUser.uid, id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete journal entry');
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteAchievementRecord(currentUser.uid, id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete achievement record');
    }
  };

  const combinedEntries: WorkLogEntry[] = [
    ...(filterView === 'journal' ? [] : engineeringLogs),
    ...(filterView === 'engineering' ? [] : journalEntries),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                DEVLOG AI &bull; ENGINEERING CAREER COPILOT
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <span>Engineering Work Log System</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Transform daily engineering achievements, blockers, learnings, and technical stacks into structured work logs persisted under your owner-bound Firestore namespace (<code className="text-indigo-300 font-mono">/users/{'{userId}'}/engineeringLogs</code>).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Owner: {currentUser.displayName || currentUser.email || currentUser.uid.slice(0, 8)}</span>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono shadow-[0_0_12px_rgba(79,70,229,0.3)] transition-colors"
              >
                <span>Authenticate to Enable Persistence</span>
              </button>
            )}
          </div>
        </div>

        {/* Type Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">ENTRY TYPE:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                id="btn-switch-eng-log"
                onClick={() => setEntryType('engineering_log')}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded text-xs font-mono transition-colors ${
                  entryType === 'engineering_log'
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Engineering Log (New)</span>
              </button>
              <button
                type="button"
                id="btn-switch-journal"
                onClick={() => setEntryType('journal_entry')}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded text-xs font-mono transition-colors ${
                  entryType === 'journal_entry'
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Baseline Journal Entry</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Collection: <code className="text-indigo-300 font-mono">/users/{'{uid}'}/{entryType === 'engineering_log' ? 'engineeringLogs' : 'journalEntries'}</code></span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Creation Form */}
      <form onSubmit={handleSubmit} className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            {entryType === 'engineering_log' ? (
              <>
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Create Engineering Work Log</span>
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Create Baseline Journal Entry</span>
              </>
            )}
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Zero Insecure Defaults &bull; Owner-Bound Storage
          </span>
        </div>

        {entryType === 'engineering_log' ? (
          /* Structured Engineering Log Form */
          <div className="space-y-4">
            {/* 1. Title */}
            <div>
              <label htmlFor="eng-title" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Log Title <span className="text-rose-400">*</span>
              </label>
              <input
                id="eng-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Designed resilient 4-tier model fallback ladder for Cloud Run AI service"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                required
              />
            </div>

            {/* 2. Work Performed */}
            <div>
              <label htmlFor="eng-work-performed" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Work Performed <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-slate-500 font-mono">Architecture, commits, changes made</span>
              </label>
              <textarea
                id="eng-work-performed"
                rows={3}
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                placeholder="Describe specific features built, code refactored, architectural decisions, or configurations deployed..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
                required
              />
            </div>

            {/* 3 & 4. Challenges & Learnings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eng-challenges" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Challenges Encountered</span>
                </label>
                <textarea
                  id="eng-challenges"
                  rows={3}
                  value={challengesEncountered}
                  onChange={(e) => setChallengesEncountered(e.target.value)}
                  placeholder="Blockers, edge cases, quota issues, permission errors, or debugging hurdles..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
                />
              </div>

              <div>
                <label htmlFor="eng-learnings" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Learnings & Insights</span>
                </label>
                <textarea
                  id="eng-learnings"
                  rows={3}
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                  placeholder="Key technical discoveries, architectural lessons, or patterns to reuse..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
                />
              </div>
            </div>

            {/* 5. Technologies Used (Tags Input) */}
            <div>
              <label htmlFor="eng-tech-input" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Technologies & Tools Used</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Press Enter or comma to add tag</span>
              </label>

              {/* Active Tag Pills */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {technologiesUsed.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-800 text-[11px] font-mono text-indigo-300"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => removeTechTag(tech)}
                      className="hover:text-rose-400 p-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  id="eng-tech-input"
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={handleTechKeyDown}
                  placeholder="Add technology (e.g., Drizzle, Kubernetes, Python)..."
                  className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => addTechTag(techInput)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono border border-slate-700 transition-colors"
                >
                  Add Tag
                </button>
              </div>

              {/* Suggested Tags */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-mono mr-1">Quick Add:</span>
                {SUGGESTED_TECH.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTechTag(s)}
                    disabled={technologiesUsed.includes(s)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Impact / Outcome */}
            <div>
              <label htmlFor="eng-impact" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Impact / Outcome</span>
              </label>
              <textarea
                id="eng-impact"
                rows={2}
                value={impactOutcome}
                onChange={(e) => setImpactOutcome(e.target.value)}
                placeholder="Measurable latency reduction, uptime improvement, business milestone reached, or sprint goal delivered..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
              />
            </div>
          </div>
        ) : (
          /* Baseline Journal Entry Form */
          <div className="space-y-4">
            <div>
              <label htmlFor="jrnl-title" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Journal Title <span className="text-rose-400">*</span>
              </label>
              <input
                id="jrnl-title"
                type="text"
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                placeholder="e.g., Sprint retrospective thoughts and mentoring session reflection"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                required
              />
            </div>

            <div>
              <label htmlFor="jrnl-content" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Journal Reflection Content <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="jrnl-content"
                rows={6}
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="Write your freeform reflection, thoughts on team dynamics, or career growth notes..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
                required
              />
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Guaranteed Transaction Verification Active</span>
          </div>

          <button
            type="submit"
            id="btn-save-work-log"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs font-mono shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
          >
            {submitting ? (
              <>
                <span className="animate-spin">&bull;</span>
                Saving to Firestore...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Save {entryType === 'engineering_log' ? 'Engineering Log' : 'Journal Entry'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* User's Stored Work Logs, Journal Entries, and Achievements Stream */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-200 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>
                {filterView === 'achievements'
                  ? 'Extracted Career Achievements'
                  : 'Your Persisted Work History'}
              </span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {filterView === 'achievements'
                ? `${achievements.length} records`
                : `${combinedEntries.length} entries`}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setFilterView('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterView === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({engineeringLogs.length + journalEntries.length})
            </button>
            <button
              onClick={() => setFilterView('engineering')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterView === 'engineering'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Engineering ({engineeringLogs.length})
            </button>
            <button
              onClick={() => setFilterView('journal')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterView === 'journal'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Journal ({journalEntries.length})
            </button>
            <button
              onClick={() => setFilterView('achievements')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                filterView === 'achievements'
                  ? 'bg-amber-600 text-white font-bold shadow-[0_0_10px_rgba(217,119,6,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Extracted Achievements ({achievements.length})</span>
            </button>
          </div>
        </div>

        {/* Dedicated Extracted Achievements Section */}
        {filterView === 'achievements' ? (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                {/* Category Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <Filter className="w-3 h-3" /> Category:
                  </span>
                  {[
                    'all',
                    'Technical Impact',
                    'Business Impact',
                    'Leadership Signals',
                    'Ownership Signals',
                    'Problem Solving Signals',
                    'Cross-Team Collaboration Signals',
                    'Innovation Signals',
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAchievementCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                        achievementCategoryFilter === cat
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'all' ? 'All Categories' : cat.replace(' Signals', '')}
                    </button>
                  ))}
                </div>

                {/* Impact Level Filters */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-500 text-[11px]">Impact:</span>
                  {['all', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setAchievementImpactFilter(lvl)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                        achievementImpactFilter === lvl
                          ? 'bg-amber-600 text-white border-amber-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Achievements List */}
            {achievements
              .filter(
                (a) =>
                  achievementCategoryFilter === 'all' ||
                  a.category === achievementCategoryFilter
              )
              .filter(
                (a) =>
                  achievementImpactFilter === 'all' ||
                  a.impactLevel === achievementImpactFilter
              ).length === 0 ? (
              <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
                <Award className="w-8 h-8 text-slate-600 mx-auto" />
                <div>
                  No extracted achievement records match the current filter.
                </div>
                <div className="text-[11px] text-slate-500">
                  Save an Engineering Log above to automatically analyze achievements using Gemini.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {achievements
                  .filter(
                    (a) =>
                      achievementCategoryFilter === 'all' ||
                      a.category === achievementCategoryFilter
                  )
                  .filter(
                    (a) =>
                      achievementImpactFilter === 'all' ||
                      a.impactLevel === achievementImpactFilter
                  )
                  .map((ach) => (
                    <AchievementCard
                      key={ach.id}
                      achievement={ach}
                      showLogTitle={true}
                      onDelete={handleDeleteAchievement}
                    />
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Work Logs and Journal Entries Stream */
          <div className="space-y-4">
            {/* Empty State */}
            {combinedEntries.length === 0 && (
              <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-mono space-y-2">
                <div>
                  No work logs or journal entries recorded yet in your Firestore namespace.
                </div>
                {!currentUser && (
                  <div className="text-amber-400 text-[11px]">
                    Sign in above to begin securely saving your engineering career logs to Cloud Firestore.
                  </div>
                )}
              </div>
            )}

            {/* List of Entries */}
            {combinedEntries.map((entry) => {
              const isEng = entry.entryType === 'engineering_log';
              const eng = entry as EngineeringLog;
              const jrnl = entry as JournalEntry;
              const logAchievements = achievements.filter(
                (a) => a.engineeringLogId === eng.id
              );
              const isExtractingThisLog = extractingLogId === eng.id;

              return (
                <div
                  key={entry.id}
                  className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 text-xs space-y-3.5 hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          isEng
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {isEng ? 'ENGINEERING LOG' : 'JOURNAL ENTRY'}
                      </span>
                      <h3 className="font-bold text-slate-100 text-sm">{entry.title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[10px] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.createdAt).toLocaleDateString()}{' '}
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={() =>
                          isEng
                            ? handleDeleteLog(entry.id)
                            : handleDeleteJournal(entry.id)
                        }
                        title="Delete log from Firestore"
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isEng ? (
                    /* Engineering Log Details */
                    <div className="space-y-3 font-sans">
                      {/* Work Performed */}
                      <div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                          Work Performed
                        </div>
                        <p className="text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                          {eng.workPerformed}
                        </p>
                      </div>

                      {/* Challenges & Learnings */}
                      {(eng.challengesEncountered || eng.learnings) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {eng.challengesEncountered && (
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                              <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Challenges Encountered
                              </div>
                              <p className="text-slate-400 text-[11px] leading-relaxed whitespace-pre-wrap">
                                {eng.challengesEncountered}
                              </p>
                            </div>
                          )}

                          {eng.learnings && (
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                              <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                Learnings
                              </div>
                              <p className="text-slate-400 text-[11px] leading-relaxed whitespace-pre-wrap">
                                {eng.learnings}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Impact Outcome */}
                      {eng.impactOutcome && (
                        <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/40">
                          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Impact / Outcome
                          </div>
                          <p className="text-emerald-200/90 text-[11px] leading-relaxed whitespace-pre-wrap">
                            {eng.impactOutcome}
                          </p>
                        </div>
                      )}

                      {/* Technologies Used Pills */}
                      {eng.technologiesUsed && eng.technologiesUsed.length > 0 && (
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            Tech Stack:
                          </span>
                          {eng.technologiesUsed.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800 text-[10px] font-mono"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Extracted Achievements Section Attached to Log */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-slate-200 font-mono">
                              Extracted Achievements ({logAchievements.length})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => extractAchievementsForLog(eng, false)}
                            disabled={isExtractingThisLog}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-indigo-300 hover:text-indigo-200 border border-indigo-900/50 text-[11px] font-mono transition-colors"
                          >
                            {isExtractingThisLog ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                                <span>Extracting with Gemini...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>{logAchievements.length > 0 ? 'Re-Analyze Signals' : 'Extract Signals'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Extraction In-Progress Indicator */}
                        {isExtractingThisLog && (
                          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/50 text-[11px] font-mono text-indigo-300 flex items-center gap-2">
                            <span className="animate-spin text-indigo-400">&bull;</span>
                            <span>{extractionStatus || 'Invoking Gemini server-side via fallback ladder...'}</span>
                          </div>
                        )}

                        {/* Extracted Achievements Cards */}
                        {logAchievements.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                            {logAchievements.map((ach) => (
                              <AchievementCard
                                key={ach.id}
                                achievement={ach}
                                onDelete={handleDeleteAchievement}
                              />
                            ))}
                          </div>
                        ) : (
                          !isExtractingThisLog && (
                            <p className="text-[11px] font-mono text-slate-500 italic bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                              No achievement records generated yet. Click &quot;Extract Signals&quot; to have Gemini evaluate career and performance review evidence.
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Journal Entry Content */
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {jrnl.content}
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
