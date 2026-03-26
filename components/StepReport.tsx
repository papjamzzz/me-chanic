'use client';

import { DiagnosisResult, VehicleData } from '@/lib/types';

interface StepReportProps {
  result: DiagnosisResult;
  vehicle: VehicleData;
  onReset: () => void;
}

export default function StepReport({ result, vehicle, onReset }: StepReportProps) {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#22c55e';
      default:
        return '#888';
    }
  };

  const handleDownloadPDF = () => {
    alert(
      'PDF download feature coming soon! You can screenshot this report for now.'
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Report Header */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#f0f0f0' }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p style={{ color: '#888' }} className="text-sm mt-2">
              {vehicle.engine ? `${vehicle.engine} • ` : ''}
              {vehicle.miles ? `${vehicle.miles} miles` : ''}
            </p>
          </div>
          <div
            style={{
              background: getUrgencyColor(result.urgency),
              color: '#0a0a0a',
            }}
            className="px-4 py-2 rounded-full font-bold text-sm"
          >
            {result.urgencyLabel}
          </div>
        </div>
      </div>

      {/* Do Not Drive Warning */}
      {result.doNotDrive.length > 0 && (
        <div
          className="p-6 rounded-lg mb-8 border-2"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: '#ef4444',
          }}
        >
          <h3 className="font-bold mb-3" style={{ color: '#ef4444' }}>
            ⚠️ DO NOT DRIVE
          </h3>
          <ul className="space-y-2">
            {result.doNotDrive.map((item, idx) => (
              <li key={idx} style={{ color: '#ef4444' }} className="text-sm">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f0' }}>
          Here's what we think is happening:
        </h2>
        <p style={{ color: '#d0d0d0' }} className="leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* Most Likely Causes */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f0' }}>
          Most Likely Causes
        </h2>
        <div className="space-y-4">
          {result.causes.map((cause) => (
            <div
              key={cause.rank}
              className="p-6 rounded-lg"
              style={{
                background: cause.rank === 1 ? 'rgba(249, 115, 22, 0.1)' : '#1a1a1a',
                border:
                  cause.rank === 1 ? '1px solid #f97316' : '1px solid #2a2a2a',
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  style={{
                    background:
                      cause.rank === 1 ? '#f97316' : 'transparent',
                    color:
                      cause.rank === 1 ? '#0a0a0a' : '#f97316',
                    border:
                      cause.rank === 1
                        ? 'none'
                        : '1px solid #f97316',
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                >
                  {cause.rank}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg" style={{ color: '#f0f0f0' }}>
                    {cause.name}
                  </h3>
                  <p style={{ color: '#d0d0d0' }} className="text-sm mt-2">
                    {cause.why}
                  </p>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: '#888' }}>
                  Likelihood
                </div>
                <div
                  style={{
                    background: '#0a0a0a',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${cause.confidence}%`,
                      background: '#f97316',
                      height: '100%',
                      borderRadius: '4px',
                      animation: 'scaleX 0.8s ease-out',
                    }}
                  />
                </div>
                <div className="text-xs mt-1" style={{ color: '#888' }}>
                  {cause.confidence}% likely
                </div>
              </div>

              {/* Parts & Labor */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="px-3 py-2 rounded text-xs"
                  style={{
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                  }}
                >
                  <div className="font-semibold mb-1">Parts</div>
                  <div style={{ color: '#f97316' }}>{cause.parts}</div>
                </div>
                <div
                  className="px-3 py-2 rounded text-xs"
                  style={{
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                  }}
                >
                  <div className="font-semibold mb-1">Labor</div>
                  <div style={{ color: '#f97316' }}>{cause.labor}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f0' }}>
          Your Game Plan — In Order
        </h2>
        <ol className="space-y-3">
          {result.nextSteps.map((step, idx) => (
            <li key={idx} className="flex gap-4">
              <span
                style={{
                  background: '#f97316',
                  color: '#0a0a0a',
                }}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
              >
                {idx + 1}
              </span>
              <span style={{ color: '#d0d0d0' }} className="text-sm">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Shop Script */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f0' }}>
          What to Say at the Shop
        </h2>
        <div
          style={{
            background: '#0a0a0a',
            borderLeft: '3px solid #f97316',
            color: '#d0d0d0',
          }}
          className="p-4 rounded italic"
        >
          "{result.shopScript}"
        </div>
      </div>

      {/* Cost Estimates */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: '#f0f0f0' }}>
          Repair Cost Estimates for ZIP {result.zip}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'DIY', value: result.costEstimate.diy },
            { label: 'Shop', value: result.costEstimate.shop },
            { label: 'Worst Case', value: result.costEstimate.worstCase },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded text-center"
              style={{
                background: '#0a0a0a',
                border: '1px solid #2a2a2a',
              }}
            >
              <div style={{ color: '#888' }} className="text-xs font-semibold mb-2">
                {item.label}
              </div>
              <div
                style={{ color: '#f97316' }}
                className="text-lg font-bold"
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 justify-between">
        <button
          onClick={handleDownloadPDF}
          style={{
            background: 'transparent',
            color: '#f0f0f0',
            border: '1px solid #2a2a2a',
          }}
          className="px-6 py-3 rounded font-bold"
        >
          📄 Download PDF Report
        </button>
        <button
          onClick={onReset}
          style={{ background: '#f97316', color: '#0a0a0a' }}
          className="px-6 py-3 rounded font-bold"
        >
          🔄 New Diagnosis
        </button>
      </div>

      {/* Disclaimer */}
      <div
        className="mt-8 p-4 rounded text-xs text-center"
        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888' }}
      >
        <p>
          ME-CHANIC is an AI-powered diagnostic tool for informational purposes only. It is not a
          substitute for professional automotive repair. Always consult a certified mechanic for
          diagnosis and repair.
        </p>
      </div>
    </div>
  );
}
