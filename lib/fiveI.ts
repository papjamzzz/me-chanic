import type {
  ModelOutput,
  ModelHypothesis,
  FiveIResult,
  FiveIInput,
  ConsensusScores,
  DivergenceReport,
  EvidenceAlignment,
  DiscriminativeTest,
  FiveIGuardrails,
  RuleContext,
} from './types';

// ── Consensus Computation ─────────────────────────────────────────────────────

function computeTopicConsensus(outputs: ModelOutput[]): number {
  // Get the primary system/cluster each model focuses on
  const topSystems = outputs.map(o => {
    const top = o.hypotheses.sort((a, b) => b.support_score - a.support_score)[0];
    return top?.system ?? 'general';
  });

  // Count agreement on top system
  const freq: Record<string, number> = {};
  topSystems.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
  const maxAgreement = Math.max(...Object.values(freq));
  return maxAgreement / outputs.length;
}

function computeMechanismConsensus(outputs: ModelOutput[]): number {
  if (outputs.length < 2) return 1.0;

  // Get top hypothesis name from each model (normalized to lowercase)
  const topHyps = outputs.map(o => {
    const top = o.hypotheses.sort((a, b) => b.support_score - a.support_score)[0];
    return top?.name?.toLowerCase().trim() ?? '';
  });

  // Check pairwise overlap using simple word matching
  let totalOverlap = 0;
  let pairs = 0;
  for (let i = 0; i < topHyps.length; i++) {
    for (let j = i + 1; j < topHyps.length; j++) {
      const wordsA = new Set(topHyps[i].split(/\s+/));
      const wordsB = new Set(topHyps[j].split(/\s+/));
      const intersection = [...wordsA].filter(w => wordsB.has(w) && w.length > 3).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      totalOverlap += union > 0 ? intersection / union : 0;
      pairs++;
    }
  }
  return pairs > 0 ? totalOverlap / pairs : 0;
}

function computeActionConsensus(outputs: ModelOutput[]): number {
  if (outputs.length < 2) return 1.0;
  const actions = outputs.map(o => o.action_recommendation.toLowerCase());

  // Check if action recommendations share meaningful words
  let overlap = 0;
  let pairs = 0;
  for (let i = 0; i < actions.length; i++) {
    for (let j = i + 1; j < actions.length; j++) {
      const wordsA = new Set(actions[i].split(/\s+/).filter(w => w.length > 4));
      const wordsB = new Set(actions[j].split(/\s+/).filter(w => w.length > 4));
      const shared = [...wordsA].filter(w => wordsB.has(w)).length;
      const total = new Set([...wordsA, ...wordsB]).size;
      overlap += total > 0 ? shared / total : 0;
      pairs++;
    }
  }
  return pairs > 0 ? Math.min(overlap / pairs + 0.1, 1.0) : 1.0;
}

function computeRiskConsensus(outputs: ModelOutput[]): number {
  const risks = outputs.map(o => o.risk_assessment);
  const freq: Record<string, number> = {};
  risks.forEach(r => { freq[r] = (freq[r] || 0) + 1; });
  const maxAgreement = Math.max(...Object.values(freq));
  return maxAgreement / outputs.length;
}

function computeConsensus(outputs: ModelOutput[]): ConsensusScores {
  return {
    topic_level: parseFloat(computeTopicConsensus(outputs).toFixed(2)),
    mechanism_level: parseFloat(computeMechanismConsensus(outputs).toFixed(2)),
    action_level: parseFloat(computeActionConsensus(outputs).toFixed(2)),
    risk_level: parseFloat(computeRiskConsensus(outputs).toFixed(2)),
  };
}

// ── Divergence Mapping ────────────────────────────────────────────────────────

function mapDivergence(outputs: ModelOutput[], consensus: ConsensusScores): DivergenceReport {
  // Find hypotheses that appear in some models but not others
  const allHypNames: Record<string, number> = {};
  outputs.forEach(o => {
    o.hypotheses.forEach(h => {
      const key = h.name.toLowerCase().trim();
      allHypNames[key] = (allHypNames[key] || 0) + 1;
    });
  });

  // Outliers: hypotheses mentioned by only 1 model
  const outliers = Object.entries(allHypNames)
    .filter(([_, count]) => count === 1)
    .map(([name]) => name);

  // Primary conflicts: top hypotheses that differ between models
  const topHypsPerModel = outputs.map(o =>
    o.hypotheses.sort((a, b) => b.support_score - a.support_score).slice(0, 2).map(h => h.system)
  );

  const allSystems = [...new Set(topHypsPerModel.flat())];
  const conflicts: string[] = [];
  if (allSystems.length > 1) {
    conflicts.push(allSystems.join(' vs '));
  }

  // Uncertainty zones
  const uncertaintyZones: string[] = [];
  if (consensus.mechanism_level < 0.5) uncertaintyZones.push('Specific cause is unclear — test before replacing parts');
  if (consensus.action_level < 0.5) uncertaintyZones.push('Next best action is disputed — start with the cheapest test');
  if (consensus.topic_level < 0.7) uncertaintyZones.push('Multiple vehicle systems may be involved');

  const isCritical = consensus.mechanism_level < 0.5 && consensus.topic_level > 0.6;

  return {
    primary_conflicts: conflicts,
    outliers,
    critical: isCritical,
    uncertainty_zones: uncertaintyZones,
  };
}

// ── Evidence Alignment ────────────────────────────────────────────────────────

function buildEvidenceMap(outputs: ModelOutput[]): EvidenceAlignment[] {
  const evidenceIndex: Record<string, { supports: Set<string>; conflicts: Set<string>; usedBy: Set<string> }> = {};

  outputs.forEach(o => {
    o.hypotheses.forEach(h => {
      h.evidence_used.forEach(ev => {
        const key = ev.toLowerCase().trim();
        if (!evidenceIndex[key]) {
          evidenceIndex[key] = { supports: new Set(), conflicts: new Set(), usedBy: new Set() };
        }
        evidenceIndex[key].supports.add(h.name);
        evidenceIndex[key].usedBy.add(o.model);
      });
      h.against.forEach(ev => {
        const key = ev.toLowerCase().trim();
        if (!evidenceIndex[key]) {
          evidenceIndex[key] = { supports: new Set(), conflicts: new Set(), usedBy: new Set() };
        }
        evidenceIndex[key].conflicts.add(h.name);
        evidenceIndex[key].usedBy.add(o.model);
      });
    });
  });

  return Object.entries(evidenceIndex)
    .filter(([_, v]) => v.supports.size > 0 || v.conflicts.size > 0)
    .slice(0, 8)  // top 8 evidence items
    .map(([evidence, v]) => ({
      evidence,
      supports: [...v.supports],
      conflicts: [...v.conflicts],
      used_by_models: [...v.usedBy],
    }));
}

// ── Discriminative Test Selection ────────────────────────────────────────────
// This is the crown jewel: what single test collapses the most uncertainty?

function selectDiscriminativeTest(
  outputs: ModelOutput[],
  divergence: DivergenceReport,
  ruleContext: RuleContext
): DiscriminativeTest {
  const clusters = ruleContext.clusters;

  // Decision tree: pick the test that best separates competing hypotheses

  // Misfire conflict: ignition vs fuel vs vacuum
  if (clusters.includes('misfire') && divergence.primary_conflicts.some(c => c.includes('misfire') || c.includes('fuel'))) {
    return {
      action: 'Swap ignition coils between cylinders one at a time',
      reason: 'If misfire code follows the coil to the new cylinder, the coil is bad. This completely separates ignition from fuel and vacuum causes.',
      cost: 'free',
      cost_estimate: '$0 — no parts needed, takes 15 minutes',
      confidence_gain: 0.45,
      separates: ['ignition coil failure', 'fuel injector issue', 'vacuum leak'],
    };
  }

  // Belt/noise conflict
  if (clusters.includes('belt_tensioner')) {
    return {
      action: 'Spray a small amount of water on the belt while engine is running',
      reason: 'If chirp/squeal stops briefly after water contact, the belt surface is the source. If noise continues, it is a bearing.',
      cost: 'free',
      cost_estimate: '$0 — water bottle only',
      confidence_gain: 0.52,
      separates: ['belt wear', 'idler pulley bearing', 'tensioner bearing'],
    };
  }

  // Cooling conflict
  if (clusters.includes('cooling')) {
    return {
      action: 'Check coolant level (cold engine only), then inspect for leaks under the car after running to temperature',
      reason: 'Separates external leak from internal head gasket failure. External leaks are cheap. Internal is expensive.',
      cost: 'free',
      cost_estimate: '$0 — visual inspection only',
      confidence_gain: 0.60,
      separates: ['coolant leak', 'failing thermostat', 'head gasket failure', 'water pump'],
    };
  }

  // Fuel/emissions conflict
  if (clusters.includes('fuel_system') || clusters.includes('exhaust_emissions')) {
    return {
      action: 'Pull live O2 sensor data with an OBD reader and check fuel trims at idle vs load',
      reason: 'Short-term trim above +10% at idle = vacuum leak or lean condition. Above +10% at load = fuel delivery. This separates sensor from actual fuel problems.',
      cost: 'low',
      cost_estimate: '$20 OBD Bluetooth dongle + free app',
      confidence_gain: 0.50,
      separates: ['oxygen sensor failure', 'vacuum leak', 'fuel injector clog', 'fuel pump weakness'],
    };
  }

  // General / no strong cluster
  return {
    action: 'Get a full OBD scan including pending codes and live data (free at AutoZone, O\'Reilly, or Advance Auto)',
    reason: 'Without codes or clear symptom cluster, live data and pending codes are the fastest way to narrow down the system.',
    cost: 'free',
    cost_estimate: '$0 — any auto parts store will scan for free',
    confidence_gain: 0.35,
    separates: ['multiple possible systems'],
  };
}

// ── Guardrails ────────────────────────────────────────────────────────────────

function buildGuardrails(
  outputs: ModelOutput[],
  consensus: ConsensusScores,
  ruleContext: RuleContext
): FiveIGuardrails {
  // Risk assessment from models
  const riskVotes = outputs.map(o => o.risk_assessment);
  const hasDoNotDrive = riskVotes.includes('do_not_drive');
  const hasCaution = riskVotes.includes('caution');

  const safeTodriveRaw = hasDoNotDrive ? 'no' : hasCaution ? 'caution' : 'yes';

  // Safety from rule context
  const safetyOverride = ruleContext.safetyFlags.includes('overheating_risk') ||
    ruleContext.safetyFlags.includes('braking_or_steering_affected');

  const safeToDrive: 'yes' | 'caution' | 'no' = safetyOverride ? 'no' : safeTodriveRaw;

  // Do not authorize major repair if mechanism consensus is low
  const doNotAuthorize = consensus.mechanism_level < 0.55;

  let reason = '';
  if (doNotAuthorize) {
    reason = `Models disagree on the specific cause (mechanism consensus: ${Math.round(consensus.mechanism_level * 100)}%). Run the recommended test first before paying for parts.`;
  } else {
    reason = 'Models show good agreement on cause. Still verify with the recommended test before major repairs.';
  }

  const urgency: 'low' | 'medium' | 'high' =
    safeToDrive === 'no' ? 'high' :
    safeToDrive === 'caution' ? 'medium' : 'low';

  return { do_not_authorize_major_repair: doNotAuthorize, reason, safe_to_drive: safeToDrive, urgency };
}

// ── Merge + Rank Hypotheses ───────────────────────────────────────────────────

function mergeHypotheses(outputs: ModelOutput[]): ModelHypothesis[] {
  const merged: Record<string, { hyp: ModelHypothesis; count: number; totalScore: number }> = {};

  outputs.forEach(o => {
    o.hypotheses.forEach(h => {
      const key = h.name.toLowerCase().trim();
      if (!merged[key]) {
        merged[key] = { hyp: { ...h, evidence_used: [...h.evidence_used], against: [...h.against] }, count: 0, totalScore: 0 };
      }
      merged[key].count++;
      merged[key].totalScore += h.support_score;
      // Merge evidence
      h.evidence_used.forEach(e => {
        if (!merged[key].hyp.evidence_used.includes(e)) merged[key].hyp.evidence_used.push(e);
      });
    });
  });

  return Object.values(merged)
    .map(({ hyp, count, totalScore }) => ({
      ...hyp,
      support_score: parseFloat((totalScore / outputs.length).toFixed(2)),
    }))
    .sort((a, b) => b.support_score - a.support_score)
    .slice(0, 5);
}

// ── Agreement Summary ─────────────────────────────────────────────────────────

function buildAgreementSummary(consensus: ConsensusScores, divergence: DivergenceReport, outputs: ModelOutput[]): string {
  const modelNames = outputs.map(o => o.model).join(', ');

  if (consensus.topic_level > 0.85 && consensus.mechanism_level > 0.6) {
    return `${modelNames} are in strong agreement on both the problem system and likely cause. High confidence in the diagnosis.`;
  } else if (consensus.topic_level > 0.7 && consensus.mechanism_level < 0.5) {
    return `Models agree on what's sick (${divergence.primary_conflicts[0]?.split(' vs ')[0] ?? 'the system'}), but disagree on the specific cause. The recommended test will resolve this before you spend money.`;
  } else {
    return `Models show moderate disagreement. This means uncertainty is real — not a malfunction. The recommended test is the fastest path to a clear answer.`;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function runFiveI(input: FiveIInput): FiveIResult {
  const { modelOutputs, ruleContext } = input;

  if (modelOutputs.length === 0) {
    throw new Error('5i requires at least one model output');
  }

  const consensus = computeConsensus(modelOutputs);
  const divergence = mapDivergence(modelOutputs, consensus);
  const evidenceMap = buildEvidenceMap(modelOutputs);
  const recommendedNextTest = selectDiscriminativeTest(modelOutputs, divergence, ruleContext);
  const guardrails = buildGuardrails(modelOutputs, consensus, ruleContext);
  const topHypotheses = mergeHypotheses(modelOutputs);
  const modelAgreementSummary = buildAgreementSummary(consensus, divergence, modelOutputs);

  return {
    consensus,
    divergence,
    evidence_map: evidenceMap,
    recommended_next_test: recommendedNextTest,
    guardrails,
    top_hypotheses: topHypotheses,
    model_agreement_summary: modelAgreementSummary,
  };
}
