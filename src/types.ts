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

export interface HealthInfo {
  status: string;
  timestamp: string;
  geminiConfigured: boolean;
  fallbackLadder: string[];
  port: number;
  uptimeSeconds: number;
}
