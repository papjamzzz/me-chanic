import { DiagnosisResult, ModelOutput, ReportCause } from '@/lib/types';
import { buildRuleContext } from '@/lib/ruleEngine';
import { runFiveI } from '@/lib/fiveI';

export const maxDuration = 60; // Railway allows up to 60s

// ── Keys ─────────────────────────────────────────────────────────────────────

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const OPENAI_KEY    = process.env.OPENAI_API_KEY ?? '';
const GEMINI_KEY    = process.env.GEMINI_API_KEY ?? '';

// ── Vision: extract diagnostic info from an image ─────────────────────────────

async function analyzeImage(buf: Buffer, mime: string, idx: number): Promise<string> {
  const b64 = buf.toString('base64');
  const imageUrl = `data:${mime};base64,${b64}`;

  const prompt = `This image is from a car diagnostic session (OBD scan tool screenshot, dashboard photo, warning light photo, or under-hood photo).

Extract EVERYTHING diagnostic you can see:
- Fault codes / DTCs (e.g. P0300, P0420)
- Sensor readings (RPM, coolant temp, voltage, MAF, O2, fuel trim, etc.)
- Warning lights that are illuminated
- Freeze frame data
- Any text from scan tool apps (Torque, OBD Fusion, Car Scanner, etc.)
- Any visible damage, leaks, or abnormalities in photos

Be specific and complete. If it's a scan tool screenshot, extract every number and code visible.
If nothing diagnostic is visible, say so briefly.`;

  // Prefer GPT-4o Vision (fastest, excellent at reading text in screenshots)
  if (OPENAI_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          }],
        }),
      });
      if (res.ok) {
        const j = await res.json();
        const text = j.choices?.[0]?.message?.content ?? '';
        return `[Image ${idx + 1}] ${text}`;
      }
    } catch (e) {
      console.warn(`GPT-4o vision failed for image ${idx}:`, e);
    }
  }

  // Fallback: Claude Vision
  if (ANTHROPIC_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });
      if (res.ok) {
        const j = await res.json();
        const text = j.content?.[0]?.text ?? '';
        return `[Image ${idx + 1}] ${text}`;
      }
    } catch (e) {
      console.warn(`Claude vision failed for image ${idx}:`, e);
    }
  }

  return `[Image ${idx + 1}] Could not analyze (no vision API available)`;
}

// ── Audio: transcribe + interpret engine sounds ───────────────────────────────

async function analyzeAudio(buf: Buffer, filename: string): Promise<string> {
  if (!OPENAI_KEY) return '';

  try {
    // Step 1: Whisper transcription
    const whisperForm = new FormData();
    const blob = new Blob([new Uint8Array(buf)], { type: 'audio/mpeg' });
    whisperForm.append('file', blob, filename);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('prompt', 'Car engine diagnostic recording. Listen for knocking, misfires, rattles, squealing, grinding.');

    const transcRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: whisperForm,
    });

    let transcript = '';
    if (transcRes.ok) {
      const j = await transcRes.json();
      transcript = j.text ?? '';
    }

    // Step 2: Interpret sounds for diagnostic value
    const interpretRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: 'You are an automotive audio diagnostic expert. Interpret vehicle sounds for diagnostic significance.',
          },
          {
            role: 'user',
            content: `The user uploaded an audio recording of their car. ${
              transcript
                ? `Whisper transcription (may be inaccurate for mechanical sounds): "${transcript}"`
                : 'No speech detected — likely engine/mechanical sounds.'
            }

Describe what this likely indicates diagnostically. What systems might be affected? What does this type of sound pattern typically mean? Be specific about mechanical cause.`,
          },
        ],
      }),
    });

    if (interpretRes.ok) {
      const j = await interpretRes.json();
      const interpretation = j.choices?.[0]?.message?.content ?? '';
      return `[Audio] ${transcript ? `Transcript: "${transcript}". ` : ''}Diagnostic interpretation: ${interpretation}`;
    }
  } catch (e) {
    console.warn('Audio analysis failed:', e);
  }

  return '';
}

// ── Diagnostic prompt builder ─────────────────────────────────────────────────

function buildPrompt(data: any, mediaFindings: string[]): string {
  const mediaSection = mediaFindings.length > 0
    ? `\nMEDIA ANALYSIS (from uploaded images/audio):\n${mediaFindings.join('\n\n')}`
    : '\nMEDIA: None uploaded';

  return `Diagnose this vehicle case. Return structured JSON with hypotheses, evidence analysis, and recommended tests.

VEHICLE: ${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.engine || 'engine unknown'}, ${data.vehicle.miles || 'mileage unknown'} miles)
ZIP: ${data.vehicle.zip || 'unknown'}

OBD DATA:
- Active DTCs: ${data.codes.dtcs.length > 0 ? data.codes.dtcs.join(', ') : 'None'}
- Pending: ${data.codes.pending.length > 0 ? data.codes.pending.join(', ') : 'None'}
- Check Engine Light: ${data.codes.cel}
- Freeze Frame: ${data.codes.freezeFrame || 'Not provided'}

SYMPTOMS:
- Issues: ${data.symptoms.issues.length > 0 ? data.symptoms.issues.join(', ') : 'None reported'}
- When: ${data.symptoms.when || 'Not specified'}
- Notes: ${data.symptoms.notes || 'None'}
- Recent work: ${data.symptoms.recentWork || 'None'}
${mediaSection}

IMPORTANT: The media analysis above may contain additional fault codes, sensor readings, and observations extracted directly from OBD screenshots and audio recordings. Factor these heavily into your diagnosis — they are primary evidence.

Generate 2-4 ranked hypotheses with:
1. name: specific diagnosis
2. support_score: 0-1 confidence
3. system: affected vehicle system (misfire/cooling/fuel_system/electrical/exhaust_emissions/drivetrain/braking_steering/belt_tensioner/no_start/general)
4. evidence_used: specific evidence from the case data
5. against: contradicting evidence`;
}

const SYSTEM_PROMPT = `You are a vehicle diagnostic reasoning engine. Analyze the case and return ONLY valid JSON matching the exact structure specified. Be precise about evidence.

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
}`;

// ── Model callers ─────────────────────────────────────────────────────────────

function parseModelJSON(text: string): any {
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

async function callClaude(prompt: string): Promise<ModelOutput> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2048, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const j = await res.json();
  const text = j.content?.[0]?.text ?? '{}';
  const p = parseModelJSON(text);
  return { model: 'claude', hypotheses: p.hypotheses || [], risk_assessment: p.risk_assessment || 'safe', action_recommendation: p.action_recommendation || '', reasoning_trace: p.reasoning_trace || '', raw_text: text };
}

async function callOpenAI(prompt: string): Promise<ModelOutput> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }], temperature: 0.5, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content ?? '{}';
  const p = parseModelJSON(text);
  return { model: 'gpt', hypotheses: p.hypotheses || [], risk_assessment: p.risk_assessment || 'safe', action_recommendation: p.action_recommendation || '', reasoning_trace: p.reasoning_trace || '', raw_text: text };
}

async function callGemini(prompt: string): Promise<ModelOutput> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 2048 } }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const j = await res.json();
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const p = parseModelJSON(text);
  return { model: 'gemini', hypotheses: p.hypotheses || [], risk_assessment: p.risk_assessment || 'safe', action_recommendation: p.action_recommendation || '', reasoning_trace: p.reasoning_trace || '', raw_text: text };
}

async function runParallelDiagnosis(prompt: string): Promise<ModelOutput[]> {
  const calls: Promise<ModelOutput | null>[] = [];
  if (ANTHROPIC_KEY) calls.push(callClaude(prompt).catch(e => { console.warn('Claude failed:', e); return null; }));
  if (OPENAI_KEY)    calls.push(callOpenAI(prompt).catch(e => { console.warn('GPT failed:', e);   return null; }));
  if (GEMINI_KEY)    calls.push(callGemini(prompt).catch(e => { console.warn('Gemini failed:', e); return null; }));
  const settled = await Promise.all(calls);
  return settled.filter((o): o is ModelOutput => o !== null);
}

// ── Result builder ────────────────────────────────────────────────────────────

function buildResult(data: any, fiveI: any, modelsUsed: string[], mediaFindings: string[]): DiagnosisResult {
  const { guardrails, top_hypotheses, recommended_next_test, evidence_map } = fiveI;

  const causes: ReportCause[] = top_hypotheses.slice(0, 3).map((hyp: any, idx: number) => ({
    rank: idx + 1,
    name: hyp.name,
    confidence: Math.round(hyp.support_score * 100),
    why: `Based on ${hyp.evidence_used?.join(', ') || 'reported symptoms'}.`,
    parts: '$50–$400',
    labor: '$150–$600',
    models_agree: idx === 0 || modelsUsed.length >= 2,
  }));

  const safeTodriveLabel =
    guardrails.safe_to_drive === 'yes' ? 'YES' :
    guardrails.safe_to_drive === 'caution' ? 'CAUTION' : 'NO';

  const mediaNote = mediaFindings.length > 0
    ? `\n\nMedia analyzed: ${mediaFindings.length} file(s) — codes and readings extracted from your uploads were factored into this diagnosis.`
    : '';

  return {
    urgency: guardrails.urgency,
    urgencyLabel:
      guardrails.urgency === 'high' ? '🚨 DO NOT DRIVE' :
      guardrails.urgency === 'medium' ? '⚠️ MONITOR CLOSELY' : '✅ NOT URGENT',
    safeTodriveLabel,
    summary: (fiveI.model_agreement_summary || 'Analysis complete.') + mediaNote,
    causes,
    mediaFindings: mediaFindings.map((f, i) => ({
      type: f.startsWith('[Audio]') ? 'audio' as const : 'obd_image' as const,
      finding: f,
      confidence: 0.8,
    })),
    evidenceMap: evidence_map || [],
    codesAnalyzed: data.codes.dtcs.concat(data.codes.pending),
    nextSteps: [
      ...(recommended_next_test ? [recommended_next_test.action] : []),
      'Get a quote from at least two shops before authorizing repairs',
      'Share this report with your mechanic — it has the codes and evidence already laid out',
    ],
    discriminativeTest: recommended_next_test,
    costEstimate: { diy: '$50–$300', shop: '$300–$1,200', worstCase: '$1,500–$4,000' },
    shopScript: `I had an AI diagnostic engine analyze my ${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}. It flagged ${causes[0]?.name || 'an issue'} as the most likely cause based on my fault codes and sensor data. Can you confirm with your scanner before we discuss repairs?`,
    doNotAuthorize: guardrails.do_not_authorize_major_repair,
    doNotAuthorizeReason: guardrails.reason,
    doNotDrive: guardrails.safe_to_drive === 'no' ? ['Critical fault detected — do not drive until inspected'] : [],
    fiveI,
    zip: data.vehicle.zip,
    modelsUsed,
  };
}

// ── Demo fallback ─────────────────────────────────────────────────────────────

function demoOutput(): ModelOutput {
  return {
    model: 'demo', hypotheses: [
      { name: 'Needs professional OBD scan', support_score: 0.85, system: 'general', evidence_used: [], against: [] },
      { name: 'Possible sensor fault', support_score: 0.6, system: 'electrical', evidence_used: [], against: [] },
    ],
    risk_assessment: 'safe', action_recommendation: 'Visit a shop for a full scan', reasoning_trace: 'Demo mode', raw_text: 'demo',
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  try {
    // Parse FormData
    const form = await req.formData();
    const metaRaw = form.get('meta');
    if (!metaRaw || typeof metaRaw !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_meta' }), { status: 400 });
    }
    const data = JSON.parse(metaRaw);

    // Collect image files
    const imageEntries: { buf: Buffer; mime: string }[] = [];
    for (const [key, val] of form.entries()) {
      if (key.startsWith('image_') && val instanceof File) {
        const ab = await val.arrayBuffer();
        imageEntries.push({ buf: Buffer.from(ab), mime: val.type || 'image/jpeg' });
      }
    }

    // Collect audio file
    let audioBuf: Buffer | null = null;
    let audioName = 'audio.mp3';
    const audioEntry = form.get('audio');
    if (audioEntry instanceof File) {
      audioBuf = Buffer.from(await audioEntry.arrayBuffer());
      audioName = audioEntry.name;
    }

    console.log(`Diagnose: ${imageEntries.length} images, audio=${!!audioBuf}, keys: claude=${!!ANTHROPIC_KEY} gpt=${!!OPENAI_KEY} gemini=${!!GEMINI_KEY}`);

    // ── Media analysis (parallel) ─────────────────────────────────────────────
    const mediaPromises: Promise<string>[] = [
      ...imageEntries.map((img, i) => analyzeImage(img.buf, img.mime, i)),
      ...(audioBuf ? [analyzeAudio(audioBuf, audioName)] : []),
    ];
    const allMediaFindings = (await Promise.all(mediaPromises)).filter(Boolean);

    // ── Model diagnosis ───────────────────────────────────────────────────────
    const prompt = buildPrompt(data, allMediaFindings);
    const ruleContext = buildRuleContext(data, []);

    let modelOutputs: ModelOutput[] = [];
    const hasKeys = ANTHROPIC_KEY || OPENAI_KEY || GEMINI_KEY;

    if (hasKeys) {
      modelOutputs = await runParallelDiagnosis(prompt);
    }
    if (modelOutputs.length === 0) {
      modelOutputs = [demoOutput(), demoOutput()];
    }

    const modelsUsed = modelOutputs.map(o => o.model);

    // ── 5i arbitration ────────────────────────────────────────────────────────
    const fiveIResult = runFiveI({ modelOutputs, ruleContext });

    // ── Build result ──────────────────────────────────────────────────────────
    const result = buildResult(data, fiveIResult, modelsUsed, allMediaFindings);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Diagnose error:', err);
    return new Response(JSON.stringify({ error: 'server_error', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
