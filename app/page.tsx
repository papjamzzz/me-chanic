'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProgressBar from '@/components/ProgressBar';
import StepVehicle from '@/components/StepVehicle';
import StepCodes from '@/components/StepCodes';
import StepSymptoms from '@/components/StepSymptoms';
import StepMedia from '@/components/StepMedia';
import StepProcessing from '@/components/StepProcessing';
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
        why: 'P0300-range codes typically indicate ignition issues, and spark plugs are the most common cause.',
        parts: '$20-$100',
        labor: '$100-$300',
      },
      {
        rank: 2,
        name: 'Faulty ignition coil',
        confidence: 45,
        why: 'Bad coil packs produce similar misfire patterns.',
        parts: '$150-$400',
        labor: '$100-$200',
      },
      {
        rank: 3,
        name: 'Fuel injector clogged',
        confidence: 35,
        why: 'Dirty injectors can cause lean conditions and misfires.',
        parts: '$50-$300',
        labor: '$150-$400',
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
        why: 'O2 sensor codes (P02xx) are among the most common emission codes.',
        parts: '$50-$200',
        labor: '$150-$300',
      },
      {
        rank: 2,
        name: 'Failing catalytic converter',
        confidence: 50,
        why: 'Clogged converters trigger emissions codes.',
        parts: '$400-$1200',
        labor: '$200-$600',
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
          why: 'Belts wear over time and create squealing or grinding sounds.',
          parts: '$30-$80',
          labor: '$100-$250',
        },
      ];
      urgency = 'low';
      urgencyLabel = 'Safe';
    } else if (symptoms.issues.includes('heat')) {
      summary = `Your vehicle is overheating. This is a serious issue that requires immediate attention. Do not drive until this is resolved.`;
      causes = [
        {
          rank: 1,
          name: 'Low coolant level',
          confidence: 80,
          why: 'Most overheating issues start with coolant loss.',
          parts: '$20-$100',
          labor: 'Varies',
        },
        {
          rank: 2,
          name: 'Failing thermostat',
          confidence: 60,
          why: 'Stuck thermostats prevent coolant circulation.',
          parts: '$100-$300',
          labor: '$150-$400',
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
      },
    ];
    urgency = 'low';
    urgencyLabel = 'Safe';
  }

  return {
    urgency,
    urgencyLabel,
    summary,
    causes,
    nextSteps: [
      'Review the most likely causes above',
      'If you are comfortable, try the cheapest fix first',
      'Get a quote from a local shop for professional repair',
      'Consider if the cost justifies keeping this vehicle',
    ],
    shopScript: `I have a ${vehicle.year} ${vehicle.make} ${vehicle.model} with ${codes.dtcs.length > 0 ? `fault codes: ${codes.dtcs.join(', ')}` : 'check engine light on'}. Can you run a scan and diagnose? I have been experiencing ${symptoms.issues.join(', ') || 'issues'}.`,
    costEstimate: {
      diy: '$100-$500',
      shop: '$300-$1500',
      worstCase: '$800-$3000',
    },
    doNotDrive,
    zip: vehicle.zip,
  };
}

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [data, setData] = useState<DiagnosisData>({
    vehicle: initialVehicle,
    codes: initialCodes,
    symptoms: initialSymptoms,
    media: initialMedia,
  });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    setStep(5);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      // Check for no_api_key error and fall back to demo
      if (result.error === 'no_api_key') {
        console.log('No API key, using demo mode');
        setResult(generateDemoResult(data));
      } else if (result.error) {
        console.error('API error:', result.error);
        setResult(generateDemoResult(data));
      } else {
        setResult(result);
      }
    } catch (err) {
      console.error('Error:', err);
      setResult(generateDemoResult(data));
    } finally {
      setIsLoading(false);
      setStep(6);
    }
  };

  const handleReset = () => {
    setStep(1);
    setData({
      vehicle: initialVehicle,
      codes: initialCodes,
      symptoms: initialSymptoms,
      media: initialMedia,
    });
    setResult(null);
  };

  return (
    <div
      style={{
        background: '#0a0a0a',
        color: '#f0f0f0',
        minHeight: '100vh',
      }}
    >
      <Header />

      {/* Show progress bar except on processing/report steps */}
      {step < 5 && <ProgressBar current={step} />}

      {/* Step 1: Vehicle */}
      {step === 1 && (
        <StepVehicle
          data={data.vehicle}
          update={updateVehicle}
          onNext={() => setStep(2)}
        />
      )}

      {/* Step 2: Codes */}
      {step === 2 && (
        <StepCodes
          data={data.codes}
          update={updateCodes}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {/* Step 3: Symptoms */}
      {step === 3 && (
        <StepSymptoms
          data={data.symptoms}
          update={updateSymptoms}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4: Media */}
      {step === 4 && (
        <StepMedia
          data={data.media}
          update={updateMedia}
          onNext={handleDiagnose}
          onBack={() => setStep(3)}
          onSkip={handleDiagnose}
        />
      )}

      {/* Step 5: Processing */}
      {step === 5 && <StepProcessing />}

      {/* Step 6: Report */}
      {step === 6 && result && (
        <StepReport
          result={result}
          vehicle={data.vehicle}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
