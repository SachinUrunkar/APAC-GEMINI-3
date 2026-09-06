import React from 'react';
import { Shield, Sparkles, Terminal, Rocket, CheckCircle2, Server, KeyRound, ListChecks, LogIn, LogOut, User as UserIcon, Database, Briefcase, Calendar, FileText } from 'lucide-react';
import { HealthInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthInfo | null;
  checkingHealth: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  checkingHealth,
}) => {
  const { currentUser, firestoreConnected, loginWithGoogle, loginAnonymously, logout } = useAuth();

  const tabs = [
    { id: 'engineering_log', label: 'Engineering Logs', icon: Briefcase },
    { id: 'standup_generator', label: 'Standup Generator', icon: Calendar },
    { id: 'sprint_summary', label: 'Sprint Summary', icon: FileText },
    { id: 'threat_model', label: 'Threat Modeling', icon: Shield },
    { id: 'security_review', label: 'Security Reviewer', icon: KeyRound },
    { id: 'resilient_prompt', label: 'Resilient AI Prompt', icon: Sparkles },
    { id: 'cloud_run', label: 'Cloud Run Deploy', icon: Rocket },
    { id: 'verification', label: 'Test Walkthroughs', icon: ListChecks },
    { id: 'audit_log', label: 'Audit Store', icon: Terminal },
  ];

  return (
    <header className="bg-[#0B0F19] border-b border-slate-800 text-[#E2E8F0] sticky top-0 z-50 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] text-white">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white uppercase font-sans">
                  DevLog AI
                </span>
                <span className="hidden lg:inline-block text-[11px] text-indigo-400 font-mono">
                  / Engineering Career Copilot
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Directive 1-7 Zero-Hardcoding &bull; 4-Tier Resilient Fallback &bull; OWASP Compliant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Firestore Status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">FIRESTORE:</span>
              <span className={firestoreConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {firestoreConnected ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            {/* Service Deployment Status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'healthy'
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                }`}
              />
              <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wider">
                {checkingHealth
                  ? 'CONNECTING...'
                  : health?.status === 'healthy'
                  ? 'ACTIVE'
                  : 'DEGRADED'}
              </span>
            </div>

            {/* User Auth Section */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-mono text-slate-300 max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email || 'Anonymous'}
                </span>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="text-slate-400 hover:text-rose-400 p-0.5 ml-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-google-signin"
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-[0_0_12px_rgba(79,70,229,0.3)] font-mono"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800/80 border-b-2 border-indigo-500 text-white shadow-[0_0_12px_rgba(79,70,229,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
