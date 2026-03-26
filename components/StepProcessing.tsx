'use client';

import { useEffect, useState } from 'react';

interface StepProcessingProps {
  // No props needed
}

interface ProcessingStep {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'done';
}

export default function StepProcessing({}: StepProcessingProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 1, label: '🚗 Identifying vehicle + recall data', status: 'pending' },
    { id: 2, label: '🔌 Parsing codes + scan data', status: 'pending' },
    { id: 3, label: '🧠 Matching symptom patterns', status: 'pending' },
    { id: 4, label: '📊 Ranking probable causes', status: 'pending' },
    { id: 5, label: '📋 Building your repair plan', status: 'pending' },
  ]);

  useEffect(() => {
    // Animate steps in sequence, 900ms apart
    const timings = [0, 900, 1800, 2700, 3600, 4500];

    timings.forEach((time, idx) => {
      if (idx < steps.length) {
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s, i) => {
              if (i === idx) return { ...s, status: 'active' };
              if (i < idx) return { ...s, status: 'done' };
              return s;
            })
          );

          // Mark this step as done after 900ms
          setTimeout(() => {
            setSteps((prev) =>
              prev.map((s, i) => (i === idx ? { ...s, status: 'done' } : s))
            );
          }, 900);
        }, time);
      }
    });
  }, []);

  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className="px-4"
    >
      <div className="max-w-md w-full text-center">
        {/* Spinner */}
        <div className="mb-8 flex justify-center">
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '3px solid #2a2a2a',
              borderTopColor: '#f97316',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-10" style={{ color: '#f0f0f0' }}>
          Analyzing Your Vehicle
        </h2>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              style={{
                opacity: step.status === 'pending' ? 0.4 : 1,
                transition: 'opacity 0.3s',
              }}
              className="text-sm font-semibold"
            >
              <div
                style={{
                  color:
                    step.status === 'done'
                      ? '#22c55e'
                      : step.status === 'active'
                        ? '#f97316'
                        : '#888',
                }}
              >
                {step.status === 'done' ? '✓' : step.status === 'active' ? '○' : '◦'} {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
