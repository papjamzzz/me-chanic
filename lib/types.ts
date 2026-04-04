// ── Vehicle + Intake ─────────────────────────────────────────────────────────

export interface VehicleData {
  vin: string;
  year: string;
  make: string;
  model: string;
  engine: string;
  miles: string;
  zip: string;
}

export interface CodesData {
  dtcs: string[];
  pending: string[];
  cel: 'on' | 'other' | 'off';
  freezeFrame: string;
}

export interface SymptomsData {
  issues: string[];
  when: string;
  rpmChange: string;
  brakeSteer: string;
  recentWork: string;
  notes: string;
}

export interface MediaData {
  audio?: File;
  video?: File;
  dash?: File;
  leak?: File;
  screenshots?: File[];
}

export interface DiagnosisData {
  vehicle: VehicleData;
  codes: CodesData;
  symptoms: SymptomsData;
  media: MediaData;
}

// ── Rule Engine ──────────────────────────────────────────────────────────────

export type SymptomCluster =
  | 'misfire'
  | 'cooling'
  | 'belt_tensioner'
  | 'fuel_system'
  | 'electrical'
  | 'exhaust_emissions'
  | 'drivetrain'
  | 'braking_steering'
  | 'no_start'
  | 'general';

export interface RuleContext {
  clusters: SymptomCluster[];
  flags: string[];           // e.g. "no_codes_present", "cold_start_only", "intermittent"
  contradictions: string[];  // e.g. "overheating + no coolant loss reported"
  safetyFlags: string[];     // e.g. "brakes_mentioned", "no_start"
}

// ── Media Analysis ───────────────────────────────────────────────────────────

export interface MediaFinding {
  type: 'audio' | 'visual' | 'dash' | 'obd_image';
  finding: string;
  confidence: number;  // 0–1
  timestamp?: string;
}

export interface MediaAnalysis {
  findings: MediaFinding[];
  uncertainties: string[];
  raw_description: string;
}

// ── Per-Model Reasoning Output ───────────────────────────────────────────────

export interface ModelHypothesis {
  name: string;
  support_score: number;   // 0–1
  evidence_used: string[];
  against: string[];
  system: SymptomCluster;  // which system this hypothesis belongs to
}

export interface ModelOutput {
  model: 'claude' | 'gpt' | 'gemini' | 'grok' | 'mistral' | 'demo';
  hypotheses: ModelHypothesis[];
  risk_assessment: 'safe' | 'caution' | 'do_not_drive';
  action_recommendation: string;
  reasoning_trace: string;
  raw_text: string;
}

// ── 5i Arbitration ───────────────────────────────────────────────────────────

export interface ConsensusScores {
  topic_level: number;      // Do models agree on the system? (combustion vs cooling vs electrical)
  mechanism_level: number;  // Do models agree on the specific cause?
  action_level: number;     // Do models agree on what to do next?
  risk_level: number;       // Do models agree on safety?
}

export interface DivergenceReport {
  primary_conflicts: string[];   // e.g. ["ignition vs fuel vs vacuum"]
  outliers: string[];            // hypotheses with no cross-model support
  critical: boolean;             // true if mechanism divergence is high AND affects repair cost
  uncertainty_zones: string[];   // specific areas of disagreement
}

export interface EvidenceAlignment {
  evidence: string;
  supports: string[];   // hypothesis names this evidence supports
  conflicts: string[];  // hypothesis names this evidence contradicts
  used_by_models: string[];  // which models cited this evidence
}

export interface DiscriminativeTest {
  action: string;
  reason: string;
  cost: 'free' | 'low' | 'medium' | 'high';
  cost_estimate: string;
  confidence_gain: number;  // 0–1, estimated uncertainty reduction
  separates: string[];      // which competing hypotheses this test separates
}

export interface FiveIGuardrails {
  do_not_authorize_major_repair: boolean;
  reason: string;
  safe_to_drive: 'yes' | 'caution' | 'no';
  urgency: 'low' | 'medium' | 'high';
}

export interface FiveIResult {
  consensus: ConsensusScores;
  divergence: DivergenceReport;
  evidence_map: EvidenceAlignment[];
  recommended_next_test: DiscriminativeTest;
  guardrails: FiveIGuardrails;
  top_hypotheses: ModelHypothesis[];  // merged + ranked across all models
  model_agreement_summary: string;    // 1-2 sentence plain English
}

export interface FiveIInput {
  modelOutputs: ModelOutput[];
  ruleContext: RuleContext;
}

// ── Final Report ─────────────────────────────────────────────────────────────

export interface ReportCause {
  rank: number;
  name: string;
  confidence: number;
  why: string;
  parts: string;
  labor: string;
  models_agree: boolean;  // true if 2+ models support this
}

export interface CostEstimate {
  diy: string;
  shop: string;
  worstCase: string;
}

export interface DiagnosisResult {
  // Page 1 — Summary
  urgency: 'low' | 'medium' | 'high';
  urgencyLabel: string;
  safeTodriveLabel: string;   // "YES" | "CAUTION" | "NO"
  summary: string;
  causes: ReportCause[];

  // Page 2 — Evidence
  mediaFindings: MediaFinding[];
  evidenceMap: EvidenceAlignment[];
  codesAnalyzed: string[];

  // Page 3 — What to do next
  nextSteps: string[];
  discriminativeTest: DiscriminativeTest | null;

  // Page 4 — Cost + Protection
  costEstimate: CostEstimate;
  shopScript: string;
  doNotAuthorize: boolean;
  doNotAuthorizeReason: string;
  doNotDrive: string[];

  // Meta
  fiveI: FiveIResult | null;  // null in demo mode
  zip: string;
  modelsUsed: string[];
}
