import React, { useState } from 'react';
import { Sparkles, Play, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Layers, Check, Copy, Activity, Database } from 'lucide-react';
import { GenerationResponse, FallbackAttempt } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveUserInteraction } from '../lib/firestoreService';

const SAMPLE_PROMPTS = [
  'Explain how Google Cloud Secret Manager IAM permissions protect Cloud Run services from API credential theft.',
  'Draft an incident response runbook for an LLM prompt injection attempting to leak Firestore document paths.',
  'Analyze why owner-bound rules in Firestore prevent broken access control (OWASP A01).',
];

export const ResilientPromptTab: React.FC = () => {
  const { currentUser, firestoreConnected } = useAuth();
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [simulateFailover, setSimulateFailover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [firestoreSaved, setFirestoreSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const executePrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setFirestoreSaved(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          simulateFailover,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      const data: GenerationResponse = await res.json();
      setResponse(data);

      // Persist to user's owner-bound Firestore subcollection if signed in
      if (currentUser && data.persistedId) {
        try {
          await saveUserInteraction(currentUser.uid, {
            id: data.persistedId,
            type: 'prompt',
            input: prompt,
            output: data.output,
            modelUsed: data.usedModel,
            latencyMs: data.totalLatencyMs,
            fallbackCount: data.attempts.filter((a) => !a.success).length,
            timestamp: new Date().toISOString(),
            status: 'success',
          });
          setFirestoreSaved(true);
        } catch (fErr) {
          console.warn('[Firestore] Owner-bound save warning:', fErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    if (!response?.output) return;
    navigator.clipboard.writeText(response.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                DIRECTIVE 6 &bull; MODEL RESILIENCE & FALLBACK PROTOCOL
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Resilient Gemini Prompt & Failover Testbed
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Executes generation requests wrapped in an automated 4-tier fallback chain:
              <span className="font-mono text-xs text-indigo-300 ml-1">
                gemini-3.6-flash &rarr; gemini-3.1-flash-lite &rarr; gemini-flash-latest &rarr; gemini-3.7-flash
              </span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                id="toggle-simulate-failover"
                checked={simulateFailover}
                onChange={(e) => setSimulateFailover(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span className="text-[11px] font-mono text-amber-300">Simulate 503 Failover</span>
            </label>
            <button
              id="btn-execute-prompt"
              onClick={executePrompt}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Execute Prompt
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fallback Ladder Visualizer */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            Automated Fallback Ladder Configuration
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { rank: '01 PRIMARY', name: 'gemini-3.6-flash', role: 'Default Ultra-Fast Generation' },
              { rank: '02 BACKUP', name: 'gemini-3.1-flash-lite', role: 'Low-Latency Failover' },
              { rank: '03 ALIAS', name: 'gemini-flash-latest', role: 'Always Current Production' },
              { rank: '04 DEEP REASON', name: 'gemini-3.7-flash', role: 'Complex Fallback & Synthesis' },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  response?.usedModel === step.name
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-mono font-semibold">{step.rank}</div>
                <div className="font-mono text-xs font-bold text-white mt-0.5">{step.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{step.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 overflow-hidden">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
              Prompt Templates
            </h3>
            <div className="space-y-2">
              {SAMPLE_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/90 text-xs text-slate-300 transition-colors line-clamp-2"
                >
                  &ldquo;{p}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {response && (
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Execution Trace</span>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                  {response.totalLatencyMs} ms total
                </span>
              </div>

              <div className="space-y-1.5">
                {response.attempts.map((att: FallbackAttempt, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border text-[11px] font-mono ${
                      att.success
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span>{att.model}</span>
                      <span>{att.latencyMs}ms</span>
                    </div>
                    {att.error && <div className="text-[10px] text-rose-400 mt-1 font-sans">{att.error}</div>}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Persistence ID:</span>
                <span className="text-emerald-400 text-[10px]">{response.persistedId}</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="prompt-input" className="text-xs font-semibold text-slate-300">
                Prompt Payload
              </label>
              <span className="text-[11px] font-mono text-slate-500">Sanitized & Null-Safe Ingested</span>
            </div>
            <textarea
              id="prompt-input"
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter instructions, questions, or analysis queries for the resilient fallback ladder..."
              className="w-full flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Generation Output Section */}
      {response && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
          <div className="px-6 py-4 border-b border-slate-800 bg-[#1C2128] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200 italic">
                Directive 6: Generated Resilient Output
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Served by: {response.usedModel}
              </span>
            </div>

            <button
              onClick={copyOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              {copied ? 'Copied' : 'Copy Output'}
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap">
              {response.output}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl font-sans">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Guaranteed Transaction Verification:</strong> Both input and output payload were strictly stripped of undefined values and persisted to the audit storage engine.
                </span>
              </div>
              {firestoreSaved && currentUser && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[10px] font-mono shrink-0">
                  <Database className="h-3 w-3 text-indigo-400" />
                  Synced to Firestore (/users/{currentUser.uid.slice(0, 6)}.../interactions)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
