import React from 'react';
import { Award, Trash2, ShieldCheck, Zap, TrendingUp, Users, Lightbulb, Compass, CheckCircle } from 'lucide-react';
import { AchievementRecord, AchievementCategory } from '../types';

interface AchievementCardProps {
  achievement: AchievementRecord;
  onDelete?: (id: string) => void;
  showLogTitle?: boolean;
}

export const getCategoryStyles = (category: AchievementCategory) => {
  switch (category) {
    case 'Technical Impact':
      return {
        badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        dot: 'bg-indigo-400',
        icon: Zap,
      };
    case 'Business Impact':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400',
        icon: TrendingUp,
      };
    case 'Leadership Signals':
      return {
        badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        dot: 'bg-purple-400',
        icon: Compass,
      };
    case 'Ownership Signals':
      return {
        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        dot: 'bg-sky-400',
        icon: ShieldCheck,
      };
    case 'Problem Solving Signals':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dot: 'bg-amber-400',
        icon: CheckCircle,
      };
    case 'Cross-Team Collaboration Signals':
      return {
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dot: 'bg-blue-400',
        icon: Users,
      };
    case 'Innovation Signals':
      return {
        badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        dot: 'bg-pink-400',
        icon: Lightbulb,
      };
    default:
      return {
        badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        dot: 'bg-slate-400',
        icon: Award,
      };
  }
};

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onDelete,
  showLogTitle = false,
}) => {
  const styles = getCategoryStyles(achievement.category);
  const Icon = styles.icon;

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'LOW':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition-colors shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${styles.badge}`}
          >
            <Icon className="w-3 h-3" />
            <span>{achievement.category}</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getImpactBadge(
              achievement.impactLevel
            )}`}
          >
            Impact: {achievement.impactLevel}
          </span>

          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono">
            Conf: {achievement.confidence}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {achievement.modelUsed && (
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              via {achievement.modelUsed}
            </span>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(achievement.id)}
              title="Delete achievement record"
              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {showLogTitle && achievement.logTitle && (
        <div className="text-[11px] font-mono text-indigo-300 flex items-center gap-1">
          <span className="text-slate-500">Source:</span>
          <span>{achievement.logTitle}</span>
        </div>
      )}

      {/* Evidence */}
      <div className="space-y-1">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Evidence & Signal:
        </div>
        <p className="text-slate-200 text-xs leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          {achievement.evidence}
        </p>
      </div>
    </div>
  );
};
