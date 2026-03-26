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
}

export interface DiagnosisData {
  vehicle: VehicleData;
  codes: CodesData;
  symptoms: SymptomsData;
  media: MediaData;
}

export interface Cause {
  rank: number;
  name: string;
  confidence: number;
  why: string;
  parts: string;
  labor: string;
}

export interface CostEstimate {
  diy: string;
  shop: string;
  worstCase: string;
}

export interface DiagnosisResult {
  urgency: 'low' | 'medium' | 'high';
  urgencyLabel: string;
  summary: string;
  causes: Cause[];
  nextSteps: string[];
  shopScript: string;
  costEstimate: CostEstimate;
  doNotDrive: string[];
  zip: string;
}
