export interface FallbackAttempt {
  model: string;
  success: boolean;
  latencyMs: number;
  error?: string;
  statusCode?: number;
}

export interface GenerationResponse {
  output: string;
  usedModel: string;
  totalLatencyMs: number;
  attempts: FallbackAttempt[];
  persistedId?: string;
}

export interface ThreatItem {
  id: string;
  threatZone: 'Input Surfaces' | 'Planning & Reasoning' | 'Tool Execution' | 'Memory & State' | 'Inter-System Communication';
  riskDescription: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owaspMapping: string;
  countermeasure: string;
  implementationStatus: 'ENFORCED' | 'RECOMMENDED' | 'PLANNED';
}

export interface SecurityReviewIssue {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  location: string;
  description: string;
  dataFlowSink: string;
  remediationCodeDiff: string;
}

export interface InteractionRecord {
  id: string;
  timestamp: string;
  type: 'prompt' | 'threat_model' | 'security_review';
  input: string;
  output: string;
  modelUsed: string;
  latencyMs: number;
  fallbackCount: number;
  status: 'success' | 'failed';
}

export interface EngineeringLog {
  id: string;
  userId: string;
  entryType: 'engineering_log';
  title: string;
  workPerformed: string;
  challengesEncountered: string;
  learnings: string;
  technologiesUsed: string[];
  impactOutcome: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  entryType: 'journal_entry';
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export type WorkLogEntry = EngineeringLog | JournalEntry;

export type AchievementCategory =
  | 'Technical Impact'
  | 'Business Impact'
  | 'Leadership Signals'
  | 'Ownership Signals'
  | 'Problem Solving Signals'
  | 'Cross-Team Collaboration Signals'
  | 'Innovation Signals';

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AchievementRecord {
  id: string;
  userId: string;
  engineeringLogId: string;
  logTitle?: string;
  category: AchievementCategory;
  evidence: string;
  impactLevel: ImpactLevel;
  confidence: ConfidenceLevel;
  createdAt: string;
  modelUsed?: string;
  updatedAt?: string;
}

export type StandupPeriod = '24h' | '3d' | '7d';

export interface StandupRecord {
  id: string;
  userId: string;
  period: StandupPeriod | string;
  content: string;
  generatedAt: string;
  sourceLogs: string[];
  modelUsed?: string;
  totalLatencyMs?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SprintSummaryPeriod = '7d' | '14d' | '30d' | 'custom';

export interface SprintSummaryRecord {
  id: string;
  userId: string;
  period: string;
  summary: string;
  generatedAt: string;
  sourceLogs: string[];
  customStartDate?: string;
  customEndDate?: string;
  modelUsed?: string;
  totalLatencyMs?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryQueryRecord {
  id: string;
  userId: string;
  question: string;
  answer: string;
  evidence: string[];
  sources: string[];
  modelUsed?: string;
  totalLatencyMs?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface HealthInfo {
  status: string;
  timestamp: string;
  geminiConfigured: boolean;
  fallbackLadder: string[];
  port: number;
  uptimeSeconds: number;
}
