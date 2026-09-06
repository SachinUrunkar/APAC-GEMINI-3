import React, { useState } from 'react';
import { KeyRound, Play, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, FileCode, ArrowRight } from 'lucide-react';
import { SecurityReviewIssue } from '../types';

const SAMPLE_VULNERABILITIES = [
  {
    title: 'Hardcoded Secret & Insecure Firestore Wildcard',
    code: `// Unsafe client file: src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// CRITICAL FLAW: Hardcoded API key
const GEMINI_API_KEY = "AIzaSyD7987213_UnsafeHardcodedSecret";

export const app = initializeApp({
  apiKey: GEMINI_API_KEY,
  projectId: "cloud-run-demo"
});

export const db = getFirestore(app);

// Insecure rules file: firestore.rules
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if true; // CRITICAL: Open wildcard access
//     }
//   }
// }`,
  },
  {
    title: 'Unsanitized Request Body & Missing Deserialization Check',
    code: `// Unsafe backend endpoint: server.ts
import express from 'express';
const app = express();

// Defect: Route defined BEFORE body parsing middleware
app.post('/api/user-reflection', async (req, res) => {
  // Defect: Unsafe direct destructuring without null-safety
  const { userId, prompt, metadata } = req.body;
  
  // Defect: Undefined values directly passed into database SDK
  await db.collection('reflections').doc(userId).set({
    prompt,
    metadata, // Potential undefined crash
    created: new Date()
  });
  
  res.json({ success: true });
});

// Mounted after route (Ordering defect)
app.use(express.json());`,
  },
];

export const SecurityReviewTab: React.FC = () => {
  const [codeSnippet, setCodeSnippet] = useState(SAMPLE_VULNERABILITIES[0].code);
  const [loading, setLoading] = useState(false);
  const [overallRisk, setOverallRisk] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [issues, setIssues] = useState<SecurityReviewIssue[]>([]);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSecurityReview = async () => {
    if (!codeSnippet.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/security-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeSnippet }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setOverallRisk(data.review?.overallRisk || 'MEDIUM');
      setSummary(data.review?.summary || 'Review completed.');
      setIssues(data.review?.issues || []);
      setModelUsed(data.usedModel);
    } catch (err: any) {
      setError(err.message || 'Security review failed');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/80';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/80';
      case 'MEDIUM':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-700/80';
      default:
        return 'bg-blue-950/80 text-blue-300 border-blue-700/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                DIRECTIVE 2 & 5 &bull; SECURITY REVIEWER PERSONA
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                OWASP & Zero-Hardcoding Security Inspector
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Scans for hardcoded credentials, maps untrusted entry points to execution sinks, validates access control boundaries, and outputs line-by-line remediation code diffs.
            </p>
          </div>

          <button
            id="btn-run-security-review"
            onClick={runSecurityReview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Reviewing Code...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Security Review
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Input & Preset Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 overflow-hidden">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
              Load Vulnerability Samples
            </h3>
            <div className="space-y-2">
              {SAMPLE_VULNERABILITIES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setCodeSnippet(sample.code)}
                  className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/90 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                    <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                    {sample.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {overallRisk && (
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="font-semibold text-slate-300 text-xs">Audit Status</div>
              <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                <span>Overall Risk:</span>
                <span className={`px-2 py-0.5 rounded font-bold border ${getSeverityBadge(overallRisk)}`}>
                  {overallRisk}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Evaluated By:</span>
                <span className="text-emerald-400">{modelUsed}</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="code-input" className="text-xs font-semibold text-slate-300">
                Target Source Code / Config / Rules to Review
              </label>
              <span className="text-[11px] font-mono text-slate-500">Node.js, TypeScript, Firestore Rules, Python</span>
            </div>
            <textarea
              id="code-input"
              rows={10}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              className="w-full flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
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

      {/* Issues & Remediation Diffs */}
      {issues.length > 0 && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-800 bg-[#1C2128] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 italic flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Directive 2: Security Findings & Remediation Diffs ({issues.length} detected)
              </h2>
              {summary && <p className="text-xs text-slate-400 mt-1">{summary}</p>}
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
              ZERO-HARDCODING HYGIENE
            </span>
          </div>

          <div className="p-6 space-y-4">
            {issues.map((issue, idx) => (
              <div key={idx} className="border border-slate-800 bg-slate-900/40 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="font-semibold text-white text-xs">{issue.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {issue.location}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{issue.description}</p>

                {/* Data flow mapping */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
                    <ArrowRight className="h-3 w-3 text-indigo-400" /> Untrusted Entry Point &rarr; Execution Sink
                  </div>
                  <div className="font-mono text-amber-300 text-[11px]">{issue.dataFlowSink}</div>
                </div>

                {/* Concrete Code Diff */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    Remediation Code Diff:
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
                    {issue.remediationCodeDiff.split('\n').map((line, lineIdx) => {
                      const isMinus = line.startsWith('-');
                      const isPlus = line.startsWith('+');
                      return (
                        <div
                          key={lineIdx}
                          className={
                            isMinus
                              ? 'text-rose-400 bg-rose-950/30 -mx-3 px-3'
                              : isPlus
                              ? 'text-emerald-400 bg-emerald-950/30 -mx-3 px-3 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
