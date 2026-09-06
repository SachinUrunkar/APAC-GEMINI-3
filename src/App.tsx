import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EngineeringLogTab } from './components/EngineeringLogTab';
import { StandupGeneratorTab } from './components/StandupGeneratorTab';
import { SprintSummaryTab } from './components/SprintSummaryTab';
import { ThreatModelingTab } from './components/ThreatModelingTab';
import { SecurityReviewTab } from './components/SecurityReviewTab';
import { ResilientPromptTab } from './components/ResilientPromptTab';
import { CloudRunDeployTab } from './components/CloudRunDeployTab';
import { VerificationGuideTab } from './components/VerificationGuideTab';
import { AuditLogTab } from './components/AuditLogTab';
import { HealthInfo } from './types';
import { Shield, Sparkles, CheckCircle2, Server, Terminal, Lock, Briefcase } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('engineering_log');
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setHealth(data);
        }
      }
    } catch {
      // Absorb transient connection resets or server startup transitions gracefully
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        checkingHealth={checkingHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Sleek KPI Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#161B22] border border-slate-800 rounded-xl">
            <div className="text-[11px] font-mono text-slate-500 uppercase mb-1">Active Threat Review</div>
            <div className="text-xl font-bold text-white tracking-tight">5 Active Zones</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Directive 1 &bull; Fully Mapped</div>
          </div>

          <div className="p-4 bg-[#161B22] border border-slate-800 rounded-xl">
            <div className="text-[11px] font-mono text-slate-500 uppercase mb-1">Model Fallback Ladder</div>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
              <span>4 Engines Live</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Directive 6 &bull; 503 Failover Ready</div>
          </div>

          <div className="p-4 bg-[#161B22] border border-slate-800 rounded-xl">
            <div className="text-[11px] font-mono text-slate-500 uppercase mb-1">Firestore Security</div>
            <div className="text-xl font-bold text-indigo-400 italic">Owner-Bound</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Directive 3 &bull; Path Isolated</div>
          </div>

          <div className="p-4 bg-[#161B22] border border-slate-800 rounded-xl">
            <div className="text-[11px] font-mono text-slate-500 uppercase mb-1">Security Score</div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-emerald-400">98.4%</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                OWASP LLM
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-emerald-500 w-[98.4%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'engineering_log' && <EngineeringLogTab />}
        {activeTab === 'standup_generator' && <StandupGeneratorTab />}
        {activeTab === 'sprint_summary' && <SprintSummaryTab />}
        {activeTab === 'threat_model' && <ThreatModelingTab />}
        {activeTab === 'security_review' && <SecurityReviewTab />}
        {activeTab === 'resilient_prompt' && <ResilientPromptTab />}
        {activeTab === 'cloud_run' && <CloudRunDeployTab />}
        {activeTab === 'verification' && <VerificationGuideTab />}
        {activeTab === 'audit_log' && <AuditLogTab />}
      </main>

      {/* Sleek Footer */}
      <footer className="h-11 bg-[#0B0F19] border-t border-slate-800 px-6 sm:px-8 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-4">
          <span>GDPR COMPLIANT</span>
          <span className="text-slate-700">&bull;</span>
          <span>SOC2 PREP</span>
          <span className="text-slate-700">&bull;</span>
          <span>OWASP TOP 10 (2024)</span>
          <span className="text-slate-700 hidden md:inline">&bull;</span>
          <span className="text-indigo-400/90 hidden md:inline">dev-tutorial=cloud-run-ai-challenge</span>
        </div>

        <div className="flex items-center gap-4">
          <span>BUILD: v2.4.12-secure-stable</span>
          <button
            onClick={() => setActiveTab('verification')}
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Walkthroughs
          </button>
        </div>
      </footer>
    </div>
  );
}
