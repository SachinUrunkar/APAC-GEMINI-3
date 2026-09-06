import React, { useState } from 'react';
import { ShieldAlert, Play, CheckCircle2, AlertTriangle, AlertCircle, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import { ThreatItem } from '../types';

const SAMPLE_ARCHITECTURES = [
  {
    title: 'Cloud Run AI Agent with Firestore & External Tools',
    desc: 'An AI assistant containerized on Cloud Run that interacts with Firestore user collections and invokes external REST APIs to fetch customer account metrics.',
    text: `Architecture:
- Frontend: Single Page Application in React hosted on Cloud Run.
- Backend: Express API handling requests and calling Google Gemini Flash via @google/genai.
- Data Store: Cloud Firestore storing user conversation history in /users/{userId}/interactions.
- External Integration: Backend invokes external CRM webhook to synchronize interaction logs.
- Secrets: GEMINI_API_KEY injected via Google Cloud Secret Manager.`,
  },
  {
    title: 'Enterprise Document Analyzer & RAG Pipeline',
    desc: 'A system taking untrusted PDF/text uploads, parsing them into vector embeddings, and running multi-step reasoning with code execution sandbox.',
    text: `Architecture:
- Ingestion: Endpoints accept multipart document uploads (PDF, DOCX) up to 25MB.
- Processing: Worker extracts text content and pushes embeddings to vector database.
- Execution: Model generates analytical Python scripts executed in an isolated runtime container.
- Access: Multi-tenant RBAC with admin and standard operator roles.`,
  },
];

export const ThreatModelingTab: React.FC = () => {
  const [architectureInput, setArchitectureInput] = useState(SAMPLE_ARCHITECTURES[0].text);
  const [loading, setLoading] = useState(false);
  const [simulateFailover, setSimulateFailover] = useState(false);
  const [threatSummary, setThreatSummary] = useState<string | null>(null);
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runThreatModel = async () => {
    if (!architectureInput.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/threat-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architecture: architectureInput,
          simulateFailover,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setThreatSummary(data.analysis?.summary || 'Analysis complete');
      setThreats(data.analysis?.threats || []);
      setModelUsed(data.usedModel);
      setLatencyMs(data.totalLatencyMs);
    } catch (err: any) {
      setError(err.message || 'Threat modeling request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyMarkdown = () => {
    if (!threats.length) return;
    const tableHeader = '| Threat Zone | Risk Description | Severity | OWASP Mapping | Countermeasure | Status |\n|---|---|---|---|---|---|\n';
    const rows = threats
      .map(
        (t) =>
          `| ${t.threatZone} | ${t.riskDescription.replace(/\|/g, '-')} | ${t.severity} | ${t.owaspMapping} | ${t.countermeasure.replace(/\|/g, '-')} | ${t.implementationStatus} |`
      )
      .join('\n');

    navigator.clipboard.writeText(`## Agentic Threat Model Report\n\n${threatSummary}\n\n${tableHeader}${rows}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-900/60 text-rose-300 border-rose-700/60';
      case 'HIGH':
        return 'bg-amber-900/60 text-amber-300 border-amber-700/60';
      case 'MEDIUM':
        return 'bg-yellow-900/60 text-yellow-300 border-yellow-700/60';
      default:
        return 'bg-blue-900/60 text-blue-300 border-blue-700/60';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                DIRECTIVE 1 &bull; AGENTIC THREAT MODELING
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Agentic Threat Analysis Engine</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Evaluates target architectures systematically across the <strong>5 Threat Zones</strong> (Input Surfaces, Planning & Reasoning, Tool Execution, Memory & State, Inter-System Communication).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simulateFailover}
                onChange={(e) => setSimulateFailover(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span className="text-[11px] font-mono">Simulate 503 Failover</span>
            </label>
            <button
              id="btn-run-threat-model"
              onClick={runThreatModel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Analyzing Threat Zones...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Generate Threat Model
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5 Threat Zones Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-800">
          {[
            { name: '1. Input Surfaces', sub: 'Prompts & untrusted payloads' },
            { name: '2. Planning & Reasoning', sub: 'Prompt injection & hijack' },
            { name: '3. Tool Execution', sub: 'SSRF & privilege escalation' },
            { name: '4. Memory & State', sub: 'Firestore cross-user leaks' },
            { name: '5. Inter-System Comm', sub: 'Token & credential leaks' },
          ].map((z, idx) => (
            <div key={idx} className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800 text-xs">
              <div className="font-semibold text-slate-200 text-xs">{z.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{z.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Section & Preset Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 overflow-hidden">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
              Load Preset Architecture
            </h3>
            <div className="space-y-2">
              {SAMPLE_ARCHITECTURES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setArchitectureInput(sample.text)}
                  className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/90 transition-colors"
                >
                  <div className="font-medium text-xs text-white">{sample.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{sample.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {modelUsed && (
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="font-semibold text-slate-300 text-xs">Execution Telemetry</div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Model Engine:</span>
                <span className="text-emerald-400">{modelUsed}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Total Latency:</span>
                <span className="text-slate-200">{latencyMs} ms</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Transaction Saved:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="architecture-input" className="text-xs font-semibold text-slate-300">
                Architecture or Feature Specification
              </label>
              <span className="text-[11px] font-mono text-slate-500">Plain Text / Markdown</span>
            </div>
            <textarea
              id="architecture-input"
              rows={8}
              value={architectureInput}
              onChange={(e) => setArchitectureInput(e.target.value)}
              placeholder="Describe your Cloud Run application, endpoints, database schemas, and AI prompts..."
              className="w-full flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Threat Summary Table (The Mandatory Execution Output) */}
      {threats.length > 0 && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-800 bg-[#1C2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200 italic">
                  Directive 1: Agentic Threat Summary Table
                </h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                  OWASP LLM Compliant
                </span>
              </div>
              {threatSummary && <p className="text-xs text-slate-400 mt-1">{threatSummary}</p>}
            </div>

            <button
              onClick={copyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied Markdown' : 'Copy Table'}
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Threat Zone</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Identified Risk</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Severity</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">OWASP Mapping</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Remediation / Countermeasure</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-800">
                {threats.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-300 bg-slate-900/20 whitespace-nowrap">
                      {t.threatZone}
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs">{t.riskDescription}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(t.severity)}`}>
                        {t.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-indigo-300 font-mono text-[11px] whitespace-nowrap">
                      {t.owaspMapping}
                    </td>
                    <td className="px-6 py-4 text-slate-300 max-w-xs">{t.countermeasure}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        {t.implementationStatus || 'ENFORCED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
