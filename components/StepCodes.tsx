'use client';

import { useState } from 'react';
import { CodesData } from '@/lib/types';

interface StepCodesProps {
  data: CodesData;
  update: (v: Partial<CodesData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepCodes({ data, update, onNext, onBack }: StepCodesProps) {
  const [dtcInput, setDtcInput] = useState('');
  const [pendingInput, setPendingInput] = useState('');

  const addDtc = () => {
    const val = dtcInput.trim().toUpperCase();
    if (val && !data.dtcs.includes(val)) {
      update({ dtcs: [...data.dtcs, val] });
      setDtcInput('');
    }
  };

  const addPending = () => {
    const val = pendingInput.trim().toUpperCase();
    if (val && !data.pending.includes(val)) {
      update({ pending: [...data.pending, val] });
      setPendingInput('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8" style={{ color: '#f0f0f0' }}>
        Scan data & fault codes
      </h2>

      {/* Warning Lights */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-4 uppercase" style={{ color: '#f0f0f0' }}>
          Warning Lights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'on', label: '✅ Check Engine ON' },
            { key: 'other', label: '⚠️ Other Warning Light' },
            { key: 'off', label: '💡 No Lights' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => update({ cel: opt.key as 'on' | 'other' | 'off' })}
              style={{
                background: data.cel === opt.key ? '#f97316' : '#0a0a0a',
                color: data.cel === opt.key ? '#0a0a0a' : '#f0f0f0',
                border: `1px solid ${data.cel === opt.key ? '#f97316' : '#2a2a2a'}`,
              }}
              className="px-4 py-3 rounded font-semibold text-sm transition-all"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmed DTCs */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-4 uppercase" style={{ color: '#f0f0f0' }}>
          Confirmed Fault Codes (DTCs)
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={dtcInput}
            onChange={(e) => setDtcInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addDtc()}
            placeholder="E.g., P0300"
            className="flex-1 px-4 py-3 rounded text-sm"
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
          <button
            onClick={addDtc}
            style={{ background: '#f97316', color: '#0a0a0a' }}
            className="px-4 py-3 rounded font-bold text-sm"
          >
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.dtcs.map((dtc) => (
            <div
              key={dtc}
              style={{
                background: '#f97316',
                color: '#0a0a0a',
              }}
              className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-2"
            >
              {dtc}
              <button
                onClick={() => update({ dtcs: data.dtcs.filter((d) => d !== dtc) })}
                className="font-bold hover:opacity-70"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Codes */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-4 uppercase" style={{ color: '#f0f0f0' }}>
          Pending Codes
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={pendingInput}
            onChange={(e) => setPendingInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addPending()}
            placeholder="E.g., P0171"
            className="flex-1 px-4 py-3 rounded text-sm"
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
          <button
            onClick={addPending}
            style={{ background: '#f97316', color: '#0a0a0a' }}
            className="px-4 py-3 rounded font-bold text-sm"
          >
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.pending.map((code) => (
            <div
              key={code}
              style={{
                background: '#f97316',
                color: '#0a0a0a',
              }}
              className="px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-2"
            >
              {code}
              <button
                onClick={() => update({ pending: data.pending.filter((c) => c !== code) })}
                className="font-bold hover:opacity-70"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Freeze Frame */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-sm font-semibold mb-4 uppercase" style={{ color: '#f0f0f0' }}>
          Freeze Frame Data (optional)
        </h3>
        <textarea
          value={data.freezeFrame}
          onChange={(e) => update({ freezeFrame: e.target.value })}
          placeholder="E.g., RPM: 1200, Load: 45%, Temp: 195°F..."
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
