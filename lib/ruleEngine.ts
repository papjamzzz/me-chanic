import type { DiagnosisData, RuleContext, SymptomCluster, MediaFinding } from './types';

// ── Cluster Detection ────────────────────────────────────────────────────────

function detectClusters(data: DiagnosisData, mediaFindings: MediaFinding[]): SymptomCluster[] {
  const clusters = new Set<SymptomCluster>();
  const codes = data.codes.dtcs.concat(data.codes.pending);
  const symptoms = data.symptoms.issues;
  const notes = (data.symptoms.notes || '').toLowerCase();

  // Misfire cluster
  if (codes.some(c => /P03\d\d/.test(c))) clusters.add('misfire');
  if (symptoms.includes('Rough idle / shaking') || symptoms.includes('rough_idle')) clusters.add('misfire');
  if (mediaFindings.some(f => f.finding.toLowerCase().includes('vibration'))) clusters.add('misfire');

  // Cooling cluster
  if (codes.some(c => /P01[12]\d/.test(c))) clusters.add('cooling');
  if (symptoms.includes('Overheating') || symptoms.includes('overheating')) clusters.add('cooling');
  if (notes.includes('overheat') || notes.includes('temp') || notes.includes('steam')) clusters.add('cooling');

  // Belt/tensioner cluster
  if (mediaFindings.some(f => f.finding.toLowerCase().includes('chirp') || f.finding.toLowerCase().includes('squeal'))) clusters.add('belt_tensioner');
  if (symptoms.includes('Strange noise') || symptoms.includes('noise')) {
    if (data.symptoms.rpmChange?.toLowerCase().includes('rpm')) clusters.add('belt_tensioner');
  }
  if (notes.includes('squeal') || notes.includes('chirp') || notes.includes('belt')) clusters.add('belt_tensioner');

  // Fuel system cluster
  if (codes.some(c => /P02\d\d|P04\d\d/.test(c))) clusters.add('fuel_system');
  if (symptoms.includes('Poor fuel economy')) clusters.add('fuel_system');
  if (notes.includes('fuel') || notes.includes('smell') || notes.includes('rich')) clusters.add('fuel_system');

  // Electrical cluster
  if (codes.some(c => /P06\d\d|P16\d\d|B\d{4}|U\d{4}/.test(c))) clusters.add('electrical');
  if (symptoms.includes('Warning light on')) clusters.add('electrical');

  // Exhaust / emissions
  if (codes.some(c => /P042\d|P043\d|P044\d/.test(c))) clusters.add('exhaust_emissions');

  // Braking / steering
  if (symptoms.includes('Braking / steering') || data.symptoms.brakeSteer?.toLowerCase().includes('worse when braking')) clusters.add('braking_steering');

  // No start
  if (symptoms.includes('Hard start / no start') || symptoms.includes('no_start')) clusters.add('no_start');

  if (clusters.size === 0) clusters.add('general');
  return Array.from(clusters);
}

// ── Flag Detection ───────────────────────────────────────────────────────────

function detectFlags(data: DiagnosisData): string[] {
  const flags: string[] = [];
  const codes = data.codes.dtcs.concat(data.codes.pending);

  if (codes.length === 0 && data.codes.cel === 'off') flags.push('no_codes_present');
  if (data.codes.cel === 'on') flags.push('check_engine_light_on');
  if (data.symptoms.when === 'Cold start only') flags.push('cold_start_only');
  if (data.symptoms.when === 'Comes and goes') flags.push('intermittent');
  if (data.symptoms.rpmChange?.includes('RPM')) flags.push('rpm_correlated');
  if (data.symptoms.rpmChange?.includes('road speed')) flags.push('speed_correlated');
  if (data.symptoms.recentWork === 'Just had work done') flags.push('recent_repair');
  if (data.codes.freezeFrame) flags.push('freeze_frame_available');
  if (data.symptoms.issues.includes('Smoke / unusual smell')) flags.push('smoke_present');

  return flags;
}

// ── Contradiction Detection ──────────────────────────────────────────────────

function detectContradictions(data: DiagnosisData, clusters: SymptomCluster[]): string[] {
  const contradictions: string[] = [];
  const notes = (data.symptoms.notes || '').toLowerCase();

  if (clusters.includes('cooling') && !data.symptoms.issues.includes('Fluid leak') && !notes.includes('coolant')) {
    contradictions.push('Overheating reported but no coolant loss mentioned — may be thermostat or water pump, not leak');
  }

  if (clusters.includes('misfire') && data.codes.dtcs.length === 0 && data.codes.cel === 'off') {
    contradictions.push('Misfire symptoms with no codes — intermittent misfire, or pre-fault threshold condition');
  }

  if (data.symptoms.recentWork === 'Just had work done' && clusters.includes('misfire')) {
    contradictions.push('Misfire appeared after recent repair — check for disconnected vacuum lines or improper reinstallation');
  }

  return contradictions;
}

// ── Safety Flag Detection ────────────────────────────────────────────────────

function detectSafetyFlags(data: DiagnosisData, clusters: SymptomCluster[]): string[] {
  const safety: string[] = [];

  if (clusters.includes('cooling')) safety.push('overheating_risk');
  if (clusters.includes('braking_steering')) safety.push('braking_or_steering_affected');
  if (clusters.includes('no_start')) safety.push('vehicle_inoperable');
  if (data.symptoms.issues.includes('Smoke / unusual smell')) safety.push('smoke_or_fumes');
  if (data.symptoms.issues.includes('Fluid leak')) safety.push('fluid_loss');

  return safety;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildRuleContext(data: DiagnosisData, mediaFindings: MediaFinding[]): RuleContext {
  const clusters = detectClusters(data, mediaFindings);
  const flags = detectFlags(data);
  const contradictions = detectContradictions(data, clusters);
  const safetyFlags = detectSafetyFlags(data, clusters);

  return { clusters, flags, contradictions, safetyFlags };
}
