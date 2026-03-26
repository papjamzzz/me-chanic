import { DiagnosisData, DiagnosisResult } from '@/lib/types';

// ── Shared prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior automotive diagnostic technician with 30+ years of hands-on experience diagnosing everything from basic Fords to European imports.

Your job is to give real people real answers — plain language, no BS, no unnecessary jargon. Your audience is an everyday car owner who is NOT a mechanic and doesn't want to get ripped off at the shop.

RULES:
1. Plain English only — explain things like you're talking to a friend
2. Rank causes by likelihood, highest first
3. Always suggest the CHEAPEST diagnostic step first
4. Give realistic cost estimates for the ZIP code provided
5. Write the "shop script" like a real conversation, not a legal document
6. Flag any safety-critical issues clearly
7. Return ONLY valid JSON — no markdown fences, no commentary

Return JSON matching this exact structure:
{
  "urgency": "low|medium|high",
  "urgencyLabel": "string (e.g. '✅ NOT URGENT' or '⚠️ MONITOR CLOSELY' or '🚨 DO NOT DRIVE')",
  "summary": "2-3 sentence plain English summary of what's probably going on",
  "causes": [
    {
      "rank": 1,
      "name": "Name of the problem",
      "confidence": 82,
      "why": "Plain English reason this fits the symptoms",
      "parts": "$X–$Y",
      "labor": "$X–$Y"
    }
  ],
  "nextSteps": [
    "Step 1 (cheapest/easiest first)...",
    "Step 2..."
  ],
  "shopScript": "Exact words the customer can say at the shop",
  "costEstimate": {
    "diy": "$X–$Y",
    "shop": "$X–$Y",
    "worstCase": "$X–$Y (explain what worst case is)"
  },
  "doNotDrive": ["Only include if genuinely unsafe — specific condition"],
  "zip": "the zip code provided"
}`;

function buildUserPrompt(data: DiagnosisData): string {
  return `Diagnose this vehicle:

VEHICLE: ${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}
Engine: ${data.vehicle.engine || 'Not specified'}
Mileage: ${data.vehicle.miles || 'Not specified'}
ZIP: ${data.vehicle.zip || 'Not specified'}

WARNING LIGHTS: ${data.codes.cel === 'on' ? 'CHECK ENGINE LIGHT ON' : data.codes.cel === 'other' ? 'Other warning light(s) on' : 'No warning lights'}

CONFIRMED FAULT CODES: ${data.codes.dtcs.length > 0 ? data.codes.dtcs.join(', ') : 'None'}
PENDING CODES: ${data.codes.pending.length > 0 ? data.codes.pending.join(', ') : 'None'}
FREEZE FRAME: ${data.codes.freezeFrame || 'Not provided'}

SYMPTOMS REPORTED: ${data.symptoms.issues.length > 0 ? data.symptoms.issues.join(', ') : 'None selected'}
When it happens: ${data.symptoms.when || 'Not specified'}
Changes with RPM: ${data.symptoms.rpmChange || 'Not specified'}
Braking/turning: ${data.symptoms.brakeSteer || 'Not specified'}
Recent work done: ${data.symptoms.recentWork || 'Not specified'}
Customer notes: ${data.symptoms.notes || 'None'}

Give me the diagnosis JSON.`;
}

// ── AI Provider Layer ───────────────────────────────────────────────────────

async function callClaude(userPrompt: string): Promise<string> {
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
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const j = await res.json();
  return j.content?.[0]?.text ?? '';
}

async function callOpenAI(userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

async function callGrok(userPrompt: string): Promise<string> {
  // Grok uses OpenAI-compatible API
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Grok error: ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

async function callGemini(userPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const j = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// Try providers in priority order
async function runDiagnosis(userPrompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'claude';

  // Try preferred provider first, then fall through
  const providers: Array<() => Promise<string>> = [];

  if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) providers.push(() => callClaude(userPrompt));
  if (process.env.OPENAI_API_KEY) providers.push(() => callOpenAI(userPrompt));
  if (process.env.GROK_API_KEY) providers.push(() => callGrok(userPrompt));
  if (process.env.GEMINI_API_KEY) providers.push(() => callGemini(userPrompt));
  // If claude wasn't first priority, add it as fallback
  if (provider !== 'claude' && process.env.ANTHROPIC_API_KEY) providers.push(() => callClaude(userPrompt));

  if (providers.length === 0) throw new Error('no_api_key');

  for (const call of providers) {
    try {
      const text = await call();
      if (text) return text;
    } catch (e) {
      console.warn('Provider failed, trying next:', e);
    }
  }
  throw new Error('all_providers_failed');
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  try {
    const data: DiagnosisData = await req.json();

    // No keys at all? Return 503 so frontend uses demo mode
    const hasAnyKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GROK_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!hasAnyKey) {
      return new Response(JSON.stringify({ error: 'no_api_key' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userPrompt = buildUserPrompt(data);
    const rawText = await runDiagnosis(userPrompt);

    // Strip any accidental markdown fences
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result: DiagnosisResult = JSON.parse(clean);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Diagnose error:', error);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
