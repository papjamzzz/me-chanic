import {
  DiagnosisData,
  DiagnosisResult,
  ModelOutput,
  ReportCause,
  MediaFinding,
} from '@/lib/types';
import { buildRuleContext } from '@/lib/ruleEngine';
import { runFiveI } from '@/lib/fiveI';

// ── Shared prompts ──────────────────────────────────────────────────────────

const REASONING_SYSTEM_PROMPT = `You are a vehicle diagnostic reasoning engine. Analyze the case and return ONLY valid JSON matching the exact structure specified. Be precise about evidence — only cite evidence that is actually present in the case data.

Return ONLY this JSON structure, no markdown fences or commentary:
{
  "hypotheses": [
    {
      "name": "hypothesis name",
      "support_score": 0.75,
      "system": "misfire",
      "evidence_used": ["rough idle", "P0300 code"],
      "against": ["no codes present"]
    }
  ],
  "risk_assessment": "safe|caution|do_not_drive",
  "action_recommendation": "specific action to test this hypothesis",
  "reasoning_trace": "brief explanation of reasoning"
}

system values: misfire, cooling, belt_tensioner, fuel_system, electrical, exhaust_emissions, drivetrain, braking_steering, no_start, general`;

function buildDiagnosticPrompt(data: DiagnosisData): string {
  return `Diagnose this vehicle case. Return structured JSON with hypotheses, evidence analysis, and recommended tests.

VEHICLE: ${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.engine || 'engine unknown'}, ${data.vehicle.miles || 'mileage unknown'})
ZIP: ${data.vehicle.zip || 'unknown'}

CODES:
- Active DTCs: ${data.codes.dtcs.length > 0 ? data.codes.dtcs.join(', ') : 'None'}
- Pending: ${data.codes.pending.length > 0 ? data.codes.pending.join(', ') : 'None'}
- CEL: ${data.codes.cel}
- Freeze Frame: ${data.codes.freezeFrame || 'Not provided'}

SYMPTOMS:
- Issues: ${data.symptoms.issues.length > 0 ? data.symptoms.issues.join(', ') : 'None reported'}
- When: ${data.symptoms.when || 'Not specified'}
- RPM changes: ${data.symptoms.rpmChange || 'Not specified'}
- Braking/steering: ${data.symptoms.brakeSteer || 'Not specified'}
- Recent work: ${data.symptoms.recentWork || 'None'}
- Notes: ${data.symptoms.notes || 'None'}

Generate 2-4 ranked hypotheses with:
1. name: specific diagnosis
2. support_score: 0-1 confidence
3. system: affected vehicle system
4. evidence_used: specific evidence supporting this (from the case data only)
5. against: evidence contradicting this`;
}

// ── AI Provider Layer ───────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<ModelOutput> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: REASONING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const j = await res.json();
  const text = j.content?.[0]?.text ?? '{}';
  const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  return {
    model: 'claude',
    hypotheses: parsed.hypotheses || [],
    risk_assessment: parsed.risk_assessment || 'safe',
    action_recommendation: parsed.action_recommendation || '',
    reasoning_trace: parsed.reasoning_trace || '',
    raw_text: text,
  };
}

async function callOpenAI(prompt: string): Promise<ModelOutput> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: REASONING_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  return {
    model: 'gpt',
    hypotheses: parsed.hypotheses || [],
    risk_assessment: parsed.risk_assessment || 'safe',
    action_recommendation: parsed.action_recommendation || '',
    reasoning_trace: parsed.reasoning_trace || '',
    raw_text: text,
  };
}

async function callGemini(prompt: string): Promise<ModelOutput> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: REASONING_SYSTEM_PROMPT + '\n\n' + prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const j = await res.json();
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  return {
    model: 'gemini',
    hypotheses: parsed.hypotheses || [],
    risk_assessment: parsed.risk_assessment || 'safe',
    action_recommendation: parsed.action_recommendation || '',
    reasoning_trace: parsed.reasoning_trace || '',
    raw_text: text,
  };
}

// Run 3 models in parallel (Claude + GPT + Gemini)
async function runParallelDiagnosis(prompt: string): Promise<ModelOutput[]> {
  const calls: Promise<ModelOutput | null>[] = [];
  const results: ModelOutput[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    calls.push(callClaude(prompt).catch(e => {
      console.warn('Claude failed:', e);
      return null;
    }));
  }
  if (process.env.OPENAI_API_KEY) {
    calls.push(callOpenAI(prompt).catch(e => {
      console.warn('OpenAI failed:', e);
      return null;
    }));
  }
  if (process.env.GEMINI_API_KEY) {
    calls.push(callGemini(prompt).catch(e => {
      console.warn('Gemini failed:', e);
      return null;
    }));
  }

  const settled = await Promise.all(calls);
  settled.forEach(output => {
    if (output) results.push(output);
  });

  return results;
}

// ── Demo Mode: Generate mock outputs ────────────────────────────────────────

function generateDemoOutput(data: DiagnosisData): ModelOutput {
  const codes = data.codes.dtcs.concat(data.codes.pending);
  const symptoms = data.symptoms.issues;

  let system: any = 'general';
  let cause = 'Diagnostic pending';

  // Simple heuristic based on codes/symptoms
  if (codes.some(c => /P03\d\d/.test(c)) || symptoms.includes('Rough idle / shaking')) {
    system = 'misfire';
    cause = 'Likely ignition or fuel system issue';
  } else if (codes.some(c => /P01[12]\d/.test(c)) || symptoms.includes('Overheating')) {
    system = 'cooling';
    cause = 'Possible thermostat or coolant issue';
  } else if (symptoms.includes('Strange noise')) {
    system = 'belt_tensioner';
    cause = 'Possible belt or pulley wear';
  }

  return {
    model: 'demo',
    hypotheses: [
      {
        name: cause,
        support_score: 0.7 + Math.random() * 0.2,
        system,
        evidence_used: codes.slice(0, 2),
        against: symptoms.length > 2 ? [symptoms[2]] : [],
      },
      {
        name: 'Secondary hypothesis',
        support_score: 0.5 + Math.random() * 0.2,
        system: 'general',
        evidence_used: symptoms.slice(0, 1),
        against: [],
      },
    ],
    risk_assessment: 'safe',
    action_recommendation: 'Get an OBD scan from a local auto parts store',
    reasoning_trace: 'Demo mode analysis',
    raw_text: 'demo',
  };
}

// ── Result Building ─────────────────────────────────────────────────────────

function buildDiagnosisResult(
  data: DiagnosisData,
  fiveIResult: any,
  modelsUsed: string[]
): DiagnosisResult {
  const { guardrails, top_hypotheses, recommended_next_test, evidence_map } = fiveIResult;

  // Convert top hypotheses to report causes
  const causes: ReportCause[] = top_hypotheses.slice(0, 3).map((hyp: any, idx: number) => {
    // Count model agreement
    const modelCount = (modelsUsed || []).length;
    const modelsAgree = idx === 0 || (modelCount >= 2);

    return {
      rank: idx + 1,
      name: hyp.name,
      confidence: Math.round(hyp.support_score * 100),
      why: `Based on ${hyp.evidence_used.join(', ') || 'the symptoms reported'}.`,
      parts: `$50–$300`,
      labor: `$150–$500`,
      models_agree: modelsAgree,
    };
  });

  // Safe to drive label
  const safeTodriveLabel =
    guardrails.safe_to_drive === 'yes' ? 'YES' :
    guardrails.safe_to_drive === 'caution' ? 'CAUTION' : 'NO';

  // Next steps from discriminative test
  const nextSteps: string[] = [];
  if (recommended_next_test) {
    nextSteps.push(recommended_next_test.action);
  }
  nextSteps.push('If the above test is inconclusive, get a full OBD scan with live data');
  nextSteps.push('Share the diagnostic results with a trusted mechanic before authorizing repairs');

  return {
    urgency: guardrails.urgency,
    urgencyLabel:
      guardrails.urgency === 'high' ? '🚨 DO NOT DRIVE' :
      guardrails.urgency === 'medium' ? '⚠️ MONITOR CLOSELY' : '✅ NOT URGENT',
    safeTodriveLabel,
    summary: fiveIResult.model_agreement_summary || 'Analysis complete.',
    causes,
    mediaFindings: [],
    evidenceMap: evidence_map || [],
    codesAnalyzed: data.codes.dtcs.concat(data.codes.pending),
    nextSteps,
    discriminativeTest: recommended_next_test,
    costEstimate: {
      diy: '$50–$300',
      shop: '$300–$1,200',
      worstCase: '$1,500–$3,000+ (major component failure)',
    },
    shopScript: 'I\'ve had an AI diagnostic review my symptoms and codes. It suggests checking [component]. Can you confirm with your scanner before we proceed with repairs?',
    doNotAuthorize: guardrails.do_not_authorize_major_repair,
    doNotAuthorizeReason: guardrails.reason,
    doNotDrive: guardrails.safe_to_drive === 'no' ? ['Overheating, brake failure, or electrical hazard detected'] : [],
    fiveI: fiveIResult,
    zip: data.vehicle.zip,
    modelsUsed,
  };
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  try {
    const data: DiagnosisData = await req.json();

    // Check for API keys
    const hasAnyKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY;

    // Build rule context
    const ruleContext = buildRuleContext(data, []);

    let modelOutputs: ModelOutput[] = [];
    let modelsUsed: string[] = [];

    // Run models if we have keys
    if (hasAnyKey) {
      const prompt = buildDiagnosticPrompt(data);
      modelOutputs = await runParallelDiagnosis(prompt);
      modelsUsed = modelOutputs.map(o => o.model);
    }

    // If no models succeeded, use demo mode
    if (modelOutputs.length === 0) {
      const demoOutput = generateDemoOutput(data);
      modelOutputs = [demoOutput, generateDemoOutput(data)];
      modelsUsed = ['demo-1', 'demo-2'];
    }

    // Run 5i arbitration
    const fiveIResult = runFiveI({ modelOutputs, ruleContext });

    // Build final diagnosis result
    const result = buildDiagnosisResult(data, fiveIResult, modelsUsed);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Diagnose error:', error);
    return new Response(JSON.stringify({ error: 'server_error', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
