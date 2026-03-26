'use client';

const STEPS = [
  { num: 1, label: 'Vehicle' },
  { num: 2, label: 'Codes' },
  { num: 3, label: 'Symptoms' },
  { num: 4, label: 'Media' },
  { num: 5, label: 'Report' },
];

interface ProgressBarProps {
  current: number;
}

export default function ProgressBar({ current }: ProgressBarProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex-1 flex flex-col items-center">
            {/* Dot and line container */}
            <div className="relative w-full flex items-center justify-center mb-4">
              {/* Line before (if not first) */}
              {idx > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 'calc(50% + 20px)',
                    height: '2px',
                    background: current > step.num ? '#f97316' : '#2a2a2a',
                  }}
                />
              )}

              {/* Dot */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background:
                    current > step.num
                      ? '#f97316'
                      : current === step.num
                        ? '#f97316'
                        : '#1a1a1a',
                  border: `2px solid ${current >= step.num ? '#f97316' : '#2a2a2a'}`,
                  color: current >= step.num ? '#0a0a0a' : '#888',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow:
                    current === step.num
                      ? '0 0 0 8px rgba(249, 115, 22, 0.2)'
                      : 'none',
                }}
                className={current === step.num ? '' : ''}
              >
                {current > step.num ? '✓' : step.num}
              </div>

              {/* Line after (if not last) */}
              {idx < STEPS.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 'calc(50% + 20px)',
                    right: 0,
                    height: '2px',
                    background: current > step.num + 1 ? '#f97316' : '#2a2a2a',
                  }}
                />
              )}
            </div>

            {/* Label */}
            <div
              style={{
                color: current >= step.num ? '#f0f0f0' : '#888',
              }}
              className="text-xs font-semibold tracking-wide"
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
