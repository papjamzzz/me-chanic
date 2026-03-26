'use client';

import { SymptomsData } from '@/lib/types';

interface StepSymptomsProps {
  data: SymptomsData;
  update: (v: Partial<SymptomsData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ISSUE_OPTIONS = [
  { key: 'noise', label: 'Strange noise 🔊' },
  { key: 'warning', label: 'Warning light 💡' },
  { key: 'heat', label: 'Overheating 🌡️' },
  { key: 'idle', label: 'Rough idle 🚗' },
  { key: 'economy', label: 'Poor fuel economy ⛽' },
  { key: 'start', label: 'Hard/no start 🔑' },
  { key: 'smoke', label: 'Smoke/smell 💨' },
  { key: 'leak', label: 'Fluid leak 💧' },
];

export default function StepSymptoms({
  data,
  update,
  onNext,
  onBack,
}: StepSymptomsProps) {
  const toggleIssue = (key: string) => {
    if (data.issues.includes(key)) {
      update({ issues: data.issues.filter((i) => i !== key) });
    } else {
      update({ issues: [...data.issues, key] });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8" style={{ color: '#f0f0f0' }}>
        Describe the symptoms
      </h2>

      {/* Issues Grid */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-4 uppercase" style={{ color: '#f0f0f0' }}>
          What's the problem?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ISSUE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleIssue(opt.key)}
              style={{
                background: data.issues.includes(opt.key) ? '#f97316' : '#0a0a0a',
                color: data.issues.includes(opt.key) ? '#0a0a0a' : '#f0f0f0',
                border: `1px solid ${data.issues.includes(opt.key) ? '#f97316' : '#2a2a2a'}`,
              }}
              className="px-4 py-3 rounded font-semibold text-sm transition-all text-left"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-6 uppercase" style={{ color: '#f0f0f0' }}>
          More details
        </h3>

        {/* Q1: When */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: '#f0f0f0' }}>
            When does it happen?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'cold-start', label: 'Cold start only' },
              { val: 'hot-only', label: 'Hot only' },
              { val: 'all-time', label: 'All the time' },
              { val: 'comes-goes', label: 'Comes and goes' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => update({ when: opt.val })}
                style={{
                  background: data.when === opt.val ? '#f97316' : '#0a0a0a',
                  color: data.when === opt.val ? '#0a0a0a' : '#f0f0f0',
                  border: `1px solid ${data.when === opt.val ? '#f97316' : '#2a2a2a'}`,
                }}
                className="px-4 py-2 rounded text-sm font-semibold"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q2: RPM */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: '#f0f0f0' }}>
            Does it change with engine RPM?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'worse-rpm', label: 'Yes, gets worse' },
              { val: 'road-speed', label: 'No, road speed only' },
              { val: 'both', label: 'Both' },
              { val: 'not-sure', label: 'Not sure' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => update({ rpmChange: opt.val })}
                style={{
                  background: data.rpmChange === opt.val ? '#f97316' : '#0a0a0a',
                  color: data.rpmChange === opt.val ? '#0a0a0a' : '#f0f0f0',
                  border: `1px solid ${data.rpmChange === opt.val ? '#f97316' : '#2a2a2a'}`,
                }}
                className="px-4 py-2 rounded text-sm font-semibold"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q3: Braking/Turning */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: '#f0f0f0' }}>
            Does braking or turning affect it?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'worse-brake', label: 'Worse braking' },
              { val: 'worse-turn', label: 'Worse turning' },
              { val: 'both-effects', label: 'Both' },
              { val: 'no-change', label: 'No change' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => update({ brakeSteer: opt.val })}
                style={{
                  background: data.brakeSteer === opt.val ? '#f97316' : '#0a0a0a',
                  color: data.brakeSteer === opt.val ? '#0a0a0a' : '#f0f0f0',
                  border: `1px solid ${data.brakeSteer === opt.val ? '#f97316' : '#2a2a2a'}`,
                }}
                className="px-4 py-2 rounded text-sm font-semibold"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q4: Recent Work */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: '#f0f0f0' }}>
            Any recent repairs?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'just-work', label: 'Just had work done' },
              { val: 'no-recent', label: 'No recent work' },
              { val: 'due-service', label: 'Due for service' },
              { val: 'unknown', label: 'Unknown' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => update({ recentWork: opt.val })}
                style={{
                  background: data.recentWork === opt.val ? '#f97316' : '#0a0a0a',
                  color: data.recentWork === opt.val ? '#0a0a0a' : '#f0f0f0',
                  border: `1px solid ${data.recentWork === opt.val ? '#f97316' : '#2a2a2a'}`,
                }}
                className="px-4 py-2 rounded text-sm font-semibold"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-4 uppercase" style={{ color: '#f0f0f0' }}>
          Anything else?
        </h3>
        <textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Any other details that might help..."
          className="w-full px-4 py-3 rounded text-sm resize-none"
          rows={4}
          style={{
            background: '#0a0a0a',
            border: '1px solid #2a2a2a',
            color: '#f0f0f0',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#f97316';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#2a2a2a';
          }}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-between gap-4">
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            color: '#f0f0f0',
            border: '1px solid #2a2a2a',
          }}
          className="px-8 py-3 rounded font-bold"
        >
          ← BACK
        </button>
        <button
          onClick={onNext}
          style={{ background: '#f97316', color: '#0a0a0a' }}
          className="px-8 py-3 rounded font-bold"
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}
