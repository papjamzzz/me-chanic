'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import DiagnosticConsole from '@/components/DiagnosticConsole';
import DiagnosisLive from '@/components/DiagnosisLive';
import StepReport from '@/components/StepReport';
import {
  DiagnosisData,
  DiagnosisResult,
  VehicleData,
  CodesData,
  SymptomsData,
  MediaData,
} from '@/lib/types';

const initialVehicle: VehicleData = {
  vin: '',
  year: '',
  make: '',
  model: '',
  engine: '',
  miles: '',
  zip: '',
};

const initialCodes: CodesData = {
  dtcs: [],
  pending: [],
  cel: 'off',
  freezeFrame: '',
};

const initialSymptoms: SymptomsData = {
  issues: [],
  when: '',
  rpmChange: '',
  brakeSteer: '',
  recentWork: '',
  notes: '',
};

const initialMedia: MediaData = {};

// Demo result generator
function generateDemoResult(data: DiagnosisData): DiagnosisResult {
  const { vehicle, codes, symptoms } = data;
  const hasMisfireCodes = codes.dtcs.some((c) => c.startsWith('P03'));
  const hasFuelCodes = codes.dtcs.some((c) => c.startsWith('P02') || c.startsWith('P04'));

  let summary = '';
  let causes: DiagnosisResult['causes'] = [];
  let urgency: 'low' | 'medium' | 'high' = 'medium';
  let urgencyLabel = 'Caution';
  let doNotDrive: string[] = [];

  if (hasMisfireCodes) {
    summary = `Your ${vehicle.year} ${vehicle.make} ${vehicle.model} is experiencing engine misfires, likely due to spark plug wear, a faulty ignition coil, or fuel injector issues. This is affecting your fuel economy and driving smoothness.`;
    causes = [
      {
        rank: 1,
        name: 'Worn spark plugs',
        confidence: 65,
        why: 'P0300-range codes typically indicate ignition issues, and spark plugs are the most common cause in vehicles over 60k miles.',
        parts: '$20–$80 (iridium plugs)',
        labor: '$100–$300',
        models_agree: true,
        priority: 'MONITOR' as const,
        partNumbers: 'NGK ILKAR7L11 / Bosch 9644 / ACDelco 41-993',
        whereToBuy: 'AutoZone / RockAuto / O\'Reilly',
        youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} spark plug replacement`,
        diyDifficulty: 'Easy' as const,
        timeEstimate: '45 min',
        diySteps: [
          'Let engine cool completely (30 min minimum)',
          'Remove engine cover if present',
          'Disconnect ignition coil connectors — label each one',
          'Remove coils with 10mm socket',
          'Use spark plug socket (usually 5/8") to unscrew old plugs',
          'Gap new plugs to spec (check sticker under hood)',
          'Thread in new plugs by hand, torque to 18–22 ft-lbs',
          'Reinstall coils, reconnect connectors, clear codes with OBD reader',
        ],
      },
      {
        rank: 2,
        name: 'Faulty ignition coil',
        confidence: 45,
        why: 'Individual coil packs fail over time and produce identical misfire patterns to spark plug wear. Often the coil on the misfiring cylinder.',
        parts: '$50–$120 per coil',
        labor: '$100–$200',
        models_agree: false,
        priority: 'MONITOR' as const,
        partNumbers: 'Delphi GN10328 / Standard Motor Products UF580',
        whereToBuy: 'AutoZone / RockAuto',
        youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} ignition coil replacement`,
        diyDifficulty: 'Easy' as const,
        timeEstimate: '20 min per coil',
        diySteps: [
          'Identify which cylinder is misfiring from the specific code (P0301 = cyl 1, P0302 = cyl 2, etc.)',
          'Swap coils between the misfiring cylinder and a known-good cylinder',
          'Clear codes and drive 5 miles — if misfire follows the coil, you found it',
          'Replace only the bad coil — no need to do all at once',
        ],
      },
      {
        rank: 3,
        name: 'Fuel injector clogged',
        confidence: 35,
        why: 'Dirty or partially clogged injectors cause lean conditions in specific cylinders, triggering misfire codes under load.',
        parts: '$50–$300 (cleaning or replacement)',
        labor: '$150–$400',
        models_agree: false,
        priority: 'INFORMATIONAL' as const,
        partNumbers: 'Sea Foam SF-16 (additive) / OEM injector if replacing',
        whereToBuy: 'AutoZone / Walmart (Sea Foam) / Dealership (OEM)',
        youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} fuel injector cleaning`,
        diyDifficulty: 'Moderate' as const,
        timeEstimate: '1–2 hours',
        diySteps: [
          'Try injector cleaner first — add 1 bottle Sea Foam or Techron to a nearly empty tank, fill up, drive',
          'If misfire persists after 2 fill-ups, suspect a failed injector',
          'Use a noid light to verify injector pulse signal before replacing',
          'DIY injector replacement is doable with fuel line disconnect tools — search specific model procedure',
        ],
      },
    ];
    urgency = 'medium';
    urgencyLabel = 'Caution';
  } else if (hasFuelCodes) {
    summary = `Your vehicle has fuel system codes indicating a problem with fuel supply or emissions. This could be a faulty oxygen sensor, catalytic converter, or fuel pump issue.`;
    causes = [
      {
        rank: 1,
        name: 'Faulty oxygen sensor',
        confidence: 70,
        why: 'O2 sensor codes (P02xx) are among the most common emission-related codes. Upstream sensors fail more often than downstream.',
        parts: '$50–$200 (upstream vs downstream)',
        labor: '$150–$300',
        models_agree: true,
        priority: 'MONITOR' as const,
        partNumbers: 'Bosch 13017 / Denso 234-4209 (verify bank/position)',
        whereToBuy: 'AutoZone / RockAuto / O\'Reilly',
        youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} oxygen sensor replacement`,
        diyDifficulty: 'Easy' as const,
        timeEstimate: '30–60 min',
        diySteps: [
          'Use code reader to identify bank (Bank 1/2) and position (Sensor 1/2)',
          'Let exhaust cool completely before working near it',
          'Use O2 sensor socket (slotted 22mm) for easy removal',
          'Apply anti-seize on new sensor threads, torque to 30–44 ft-lbs',
          'Clear codes and verify fix with a drive cycle',
        ],
      },
      {
        rank: 2,
        name: 'Failing catalytic converter',
        confidence: 50,
        why: 'A degraded cat triggers downstream O2 sensor codes and emissions failures. Often a $400–$1,200 repair — verify with a mechanic before replacing.',
        parts: '$400–$1,200 (OEM vs aftermarket)',
        labor: '$200–$600',
        models_agree: false,
        priority: 'MONITOR' as const,
        partNumbers: 'Walker 16461 (aftermarket) / OEM varies by model',
        whereToBuy: 'RockAuto / Dealership for OEM',
        youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} catalytic converter replacement`,
        diyDifficulty: 'Hard' as const,
        timeEstimate: '2–4 hours',
        diySteps: [
          'Verify cat failure with a back-pressure test before buying one — a shop can do this',
          'Check if O2 sensor replacement alone clears the code first (cheaper)',
          'Cat replacement requires cutting or unbolting exhaust — WD-40 on bolts days before',
          'Consider OEM or CARB-compliant cat to avoid re-triggering codes',
        ],
      },
    ];
    urgency = 'medium';
    urgencyLabel = 'Caution';
  } else if (symptoms.issues.length > 0) {
    if (symptoms.issues.includes('noise')) {
      summary = `Your vehicle is making an unusual noise. Based on your description, this could be a belt issue, bearing wear, or exhaust problem. Have it inspected to prevent further damage.`;
      causes = [
        {
          rank: 1,
          name: 'Worn serpentine belt',
          confidence: 60,
          why: 'Belts wear over time and create squealing or grinding sounds, especially on cold starts. Tensioner pulley failure causes similar noise.',
          parts: '$30–$80 (belt + tensioner kit)',
          labor: '$100–$250',
          models_agree: true,
          priority: 'MONITOR' as const,
          partNumbers: 'Gates K060882 (belt) / Gates 38368 (tensioner) — verify fitment',
          whereToBuy: 'AutoZone / O\'Reilly',
          youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} serpentine belt replacement`,
          diyDifficulty: 'Moderate' as const,
          timeEstimate: '30–60 min',
          diySteps: [
            'Take a photo of belt routing before removal (or check sticker under hood)',
            'Use belt tensioner tool or 3/8" breaker bar to release tensioner',
            'Slip old belt off, route new belt following the diagram',
            'Check all pulleys for wobble or roughness while belt is off',
            'Replace tensioner and idler pulleys if they show wear — it\'s cheap insurance',
          ],
        },
      ];
      urgency = 'low';
      urgencyLabel = 'Safe';
    } else if (symptoms.issues.includes('heat')) {
      summary = `Your vehicle is overheating. This is a serious issue that requires immediate attention. Do not drive until this is resolved.`;
      causes = [
        {
          rank: 1,
          name: 'Low coolant / coolant leak',
          confidence: 80,
          why: 'Most overheating issues start with coolant loss from a hose, radiator, water pump, or head gasket. Check coolant level in overflow reservoir first.',
          parts: '$20–$100 (varies by leak source)',
          labor: 'Varies — could be $50 hose or $2,000+ head gasket',
          models_agree: true,
          priority: 'SAFETY CRITICAL' as const,
          partNumbers: 'Prestone AF888 (coolant) / Gates radiator hoses',
          whereToBuy: 'AutoZone / Walmart',
          youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} overheating diagnosis coolant leak`,
          diyDifficulty: 'Easy' as const,
          timeEstimate: '15 min diagnosis',
          diySteps: [
            'STOP DRIVING — overheating causes permanent engine damage',
            'Let engine cool 30+ minutes before opening anything',
            'Check coolant overflow reservoir level (marked MIN/MAX)',
            'Look for white smoke from exhaust (head gasket), puddles under car, wet hoses',
            'DO NOT start engine if coolant is empty without finding the leak first',
            'If you suspect head gasket, do not drive — have it towed',
          ],
        },
        {
          rank: 2,
          name: 'Failing thermostat',
          confidence: 60,
          why: 'A stuck-closed thermostat prevents coolant from circulating, causing rapid overheating. A $15 part with a 2-hour DIY fix.',
          parts: '$15–$60 (thermostat + gasket kit)',
          labor: '$150–$300',
          models_agree: false,
          priority: 'MONITOR' as const,
          partNumbers: 'Stant 45913 / Motorad 488-192',
          whereToBuy: 'AutoZone / O\'Reilly / RockAuto',
          youtubeQuery: `${vehicle.year} ${vehicle.make} ${vehicle.model} thermostat replacement`,
          diyDifficulty: 'Moderate' as const,
          timeEstimate: '1.5 hours',
          diySteps: [
            'Drain coolant from lower radiator hose into a clean container',
            'Follow upper radiator hose to the thermostat housing',
            'Remove housing bolts, extract thermostat, note orientation',
            'Clean mating surfaces, install new thermostat (spring toward engine)',
            'Refill with 50/50 coolant mix, bleed air from system per manufacturer procedure',
          ],
        },
      ];
      urgency = 'high';
      urgencyLabel = 'DO NOT DRIVE';
      doNotDrive = [
        'Overheating can cause engine damage',
        'Risk of coolant system failure',
      ];
    } else {
      summary = `Based on your reported symptoms, there appear to be one or more issues with your vehicle. A professional diagnostic scan is recommended to pinpoint the exact cause.`;
      causes = [
        {
          rank: 1,
          name: 'Needs professional diagnosis',
          confidence: 85,
          why: 'Your symptoms suggest multiple possibilities.',
          parts: 'TBD',
          labor: '$50-$150 diagnostic',
          models_agree: true,
        },
      ];
      urgency = 'medium';
      urgencyLabel = 'Caution';
    }
  } else {
    summary =
      'Without fault codes or specific symptoms, it is difficult to pinpoint an issue. Consider having a full diagnostic scan performed.';
    causes = [
      {
        rank: 1,
        name: 'Run a full diagnostic',
        confidence: 90,
        why: 'A comprehensive scan will reveal any hidden issues.',
        parts: 'N/A',
        labor: '$50-$150',
        models_agree: true,
      },
    ];
    urgency = 'low';
    urgencyLabel = 'Safe';
  }

  return {
    urgency,
    urgencyLabel,
    safeTodriveLabel: urgency === 'high' ? 'NO' : urgency === 'medium' ? 'CAUTION' : 'YES',
    verdictStatement: summary,
    summary,
    causes,
    mediaFindings: [],
    evidenceMap: [],
    codesAnalyzed: codes.dtcs.concat(codes.pending),
    nextSteps: [
      'Start with the #1 ranked cause — it\'s the cheapest and most likely',
      'Use the DIY steps below before paying a shop',
      'Get written estimates from at least 2 shops before authorizing anything',
      'Show them this report — it tells them exactly what to look for',
    ],
    discriminativeTest: null,
    shopScript: `Hi, I have a ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.miles ? ` with ${vehicle.miles} miles` : ''}. I ran an AI diagnostic that flagged ${causes[0]?.name || 'a fault'} as the most likely issue${codes.dtcs.length > 0 ? ` — codes: ${codes.dtcs.join(', ')}` : ''}. Before I authorize any work, can you confirm with your scanner and give me a written estimate? I already know what the parts should cost.`,
    costEstimate: {
      diy: '$20–$300',
      shop: '$150–$1,500',
      worstCase: '$800–$4,000',
    },
    additionalScans: [
      'Live data scan — check O2 sensor voltages, fuel trim, and MAF readings',
      'Cylinder balance test to isolate misfiring cylinder',
      'Cooling system pressure test if overheating suspected',
    ],
    doNotAuthorize: false,
    doNotAuthorizeReason: '',
    doNotDrive,
    fiveI: null,
    zip: vehicle.zip,
    modelsUsed: ['demo'],
  };
}

export default function Home() {
  const [step, setStep] = useState<1 | 5 | 6>(1);
  const [data, setData] = useState<DiagnosisData>({
    vehicle: initialVehicle,
    codes: initialCodes,
    symptoms: initialSymptoms,
    media: initialMedia,
  });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveEvents, setLiveEvents] = useState<Array<{id:number;type:any;model?:string;message:string;ts:number}>>([]);
  const [spectrogramCanvas, setSpectrogramCanvas] = useState<HTMLCanvasElement | null>(null);
  const eventIdRef = useRef(0);

  const addEvent = (type: string, message: string, model?: string) => {
    setLiveEvents(prev => [...prev, {
      id: eventIdRef.current++,
      type: type as any,
      model,
      message,
      ts: Date.now(),
    }]);
  };

  const updateVehicle = (v: Partial<VehicleData>) => {
    setData((prev) => ({ ...prev, vehicle: { ...prev.vehicle, ...v } }));
  };

  const updateCodes = (v: Partial<CodesData>) => {
    setData((prev) => ({ ...prev, codes: { ...prev.codes, ...v } }));
  };

  const updateSymptoms = (v: Partial<SymptomsData>) => {
    setData((prev) => ({ ...prev, symptoms: { ...prev.symptoms, ...v } }));
  };

  const updateMedia = (v: Partial<MediaData>) => {
    setData((prev) => ({ ...prev, media: { ...prev.media, ...v } }));
  };

  const handleDiagnose = async () => {
    setIsLoading(true);
    setLiveEvents([]);
    setStep(5 as 5);

    addEvent('start', 'Diagnostic engine starting…');

    try {
      // Build FormData so files actually reach the server
      const form = new FormData();
      form.append('meta', JSON.stringify({
        vehicle: data.vehicle,
        codes: data.codes,
        symptoms: data.symptoms,
      }));

      // Collect all unique image files
      const seen = new Set<File>();
      let imgIdx = 0;
      const addImage = (f: File | undefined) => {
        if (f && !seen.has(f)) { seen.add(f); form.append(`image_${imgIdx++}`, f, f.name); }
      };
      (data.media.screenshots || []).forEach(addImage);
      addImage(data.media.dash);
      addImage(data.media.leak);

      // Audio / video
      if (data.media.audio) {
        form.append('audio', data.media.audio, data.media.audio.name);
        addEvent('audio', `Sending audio for spectrogram analysis: ${data.media.audio.name}`);
      }
      if (data.media.video) form.append('video', data.media.video, data.media.video.name);

      if (imgIdx > 0) addEvent('vision', `Sending ${imgIdx} image${imgIdx > 1 ? 's' : ''} to GPT-4o Vision…`);
      addEvent('model', 'Claude Sonnet — reasoning on case data…', 'claude');
      addEvent('model', 'GPT-4o — cross-referencing codes and symptoms…', 'gpt');
      addEvent('model', 'Gemini 1.5 — confirming findings…', 'gemini');

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        body: form,
      });

      const result = await res.json();

      // Check for no_api_key error and fall back to demo
      if (result.error === 'no_api_key') {
        addEvent('error', 'No API key set — using demo mode');
        setResult(generateDemoResult(data));
      } else if (result.error) {
        addEvent('error', `API error: ${result.error}`);
        setResult(generateDemoResult(data));
      } else {
        addEvent('arbitration', '5i consensus engine arbitrating across all models…');
        addEvent('done', `Diagnosis complete — ${result.modelsUsed?.length || 0} models used, ${result.causes?.length || 0} causes ranked`);
        setResult(result);
      }
    } catch (err) {
      console.error('Error:', err);
      addEvent('error', `Connection error: ${String(err)}`);
      setResult(generateDemoResult(data));
    } finally {
      setIsLoading(false);
      setStep(6 as 6);
    }
  };

  const handleReset = () => {
    setStep(1 as 1);
    setData({
      vehicle: initialVehicle,
      codes: initialCodes,
      symptoms: initialSymptoms,
      media: initialMedia,
    });
    setResult(null);
  };

  return (
    <div style={{ background: '#0a0a0a', color: '#f0f0f0', minHeight: '100vh' }}>
      <Header />

      {/* Console */}
      {step === 1 && (
        <DiagnosticConsole
          vehicle={data.vehicle}
          codes={data.codes}
          symptoms={data.symptoms}
          media={data.media}
          updateVehicle={updateVehicle}
          updateCodes={updateCodes}
          updateSymptoms={updateSymptoms}
          updateMedia={updateMedia}
          onDiagnose={handleDiagnose}
          onSpectrogramReady={setSpectrogramCanvas}
        />
      )}

      {/* Live mission control — shown during processing */}
      {step === 5 && (
        <DiagnosisLive
          events={liveEvents}
          spectrogramCanvas={spectrogramCanvas}
          vehicle={data.vehicle}
          fileCount={(data.media.screenshots?.length || 0) + (data.media.dash ? 1 : 0)}
          hasAudio={!!data.media.audio}
        />
      )}

      {/* Report */}
      {step === 6 && result && (
        <StepReport result={result} vehicle={data.vehicle} onReset={handleReset} />
      )}
    </div>
  );
}
