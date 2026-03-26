'use client';

import { useState } from 'react';
import { VehicleData } from '@/lib/types';

interface StepVehicleProps {
  data: VehicleData;
  update: (v: Partial<VehicleData>) => void;
  onNext: () => void;
}

interface NHTSAResponse {
  Results: Array<{
    Variable: string;
    Value: string | null;
  }>;
}

export default function StepVehicle({ data, update, onNext }: StepVehicleProps) {
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState('');
  const [vinSuccess, setVinSuccess] = useState(false);

  const handleVinLookup = async () => {
    const vin = data.vin.trim().toUpperCase();
    if (!vin || vin.length < 10) {
      setVinError('VIN must be at least 10 characters');
      return;
    }

    setVinLoading(true);
    setVinError('');
    setVinSuccess(false);

    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
      );
      const data: NHTSAResponse = await res.json();

      const results = data.Results || [];
      const getVal = (variable: string) => {
        const item = results.find((r) => r.Variable === variable);
        return item?.Value || '';
      };

      const year = getVal('Model Year');
      const make = getVal('Make');
      const model = getVal('Model');
      const engine = getVal('Engine Description');

      if (!year || !make || !model) {
        setVinError('VIN not found. Please enter manually.');
        setVinLoading(false);
        return;
      }

      update({
        year,
        make,
        model,
        engine: engine || '',
      });

      setVinSuccess(true);
      setVinError('');
    } catch (err) {
      setVinError('Error looking up VIN. Please try again.');
      console.error(err);
    } finally {
      setVinLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8" style={{ color: '#f0f0f0' }}>
        Tell us about your vehicle
      </h2>

      {/* VIN Lookup Section */}
      <div
        className="p-6 rounded-lg mb-8"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <label className="block text-sm font-semibold mb-3" style={{ color: '#f0f0f0' }}>
          VIN (optional — but speeds things up)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={data.vin}
            onChange={(e) => {
              update({ vin: e.target.value.toUpperCase() });
              setVinSuccess(false);
              setVinError('');
            }}
            placeholder="E.g., JH2RC5304LM200143"
            className="flex-1 px-4 py-3 rounded bg-opacity-50 text-sm"
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
            onClick={handleVinLookup}
            disabled={vinLoading || !data.vin.trim()}
            style={{
              background: vinLoading ? '#666' : '#f97316',
              color: '#0a0a0a',
            }}
            className="px-6 py-3 rounded font-bold text-sm disabled:opacity-50"
          >
            {vinLoading ? 'LOOKING UP...' : 'LOOK UP'}
          </button>
        </div>

        {vinError && (
          <div
            className="mt-3 px-4 py-2 rounded text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
          >
            {vinError}
          </div>
        )}

        {vinSuccess && (
          <div
            className="mt-3 px-4 py-2 rounded text-sm"
            style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
          >
            ✓ VIN found! Info filled below.
          </div>
        )}
      </div>

      {/* Manual Entry Section */}
      <div
        className="p-6 rounded-lg"
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        <h3 className="text-lg font-semibold mb-6" style={{ color: '#f0f0f0' }}>
          Vehicle Details
        </h3>

        {/* Year, Make, Model */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#888' }}>
              YEAR
            </label>
            <input
              type="text"
              value={data.year}
              onChange={(e) => update({ year: e.target.value })}
              placeholder="2015"
              className="w-full px-4 py-3 rounded text-sm"
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
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#888' }}>
              MAKE
            </label>
            <input
              type="text"
              value={data.make}
              onChange={(e) => update({ make: e.target.value })}
              placeholder="Honda"
              className="w-full px-4 py-3 rounded text-sm"
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
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#888' }}>
              MODEL
            </label>
            <input
              type="text"
              value={data.model}
              onChange={(e) => update({ model: e.target.value })}
              placeholder="Civic"
              className="w-full px-4 py-3 rounded text-sm"
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
        </div>

        {/* Engine, Miles */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#888' }}>
              ENGINE
            </label>
            <input
              type="text"
              value={data.engine}
              onChange={(e) => update({ engine: e.target.value })}
              placeholder="2.0L 4-cyl"
              className="w-full px-4 py-3 rounded text-sm"
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
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#888' }}>
              MILES
            </label>
            <input
              type="text"
              value={data.miles}
              onChange={(e) => update({ miles: e.target.value })}
              placeholder="125,000"
              className="w-full px-4 py-3 rounded text-sm"
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
        </div>

        {/* ZIP Code */}
        <div className="mb-6">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#888' }}>
            ZIP CODE (for repair cost estimates)
          </label>
          <input
            type="text"
            value={data.zip}
            onChange={(e) => update({ zip: e.target.value })}
            placeholder="94105"
            className="w-full px-4 py-3 rounded text-sm"
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
      </div>

      {/* Next Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!data.year || !data.make || !data.model}
          style={{
            background: data.year && data.make && data.model ? '#f97316' : '#666',
            color: '#0a0a0a',
          }}
          className="px-8 py-3 rounded font-bold disabled:opacity-50"
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}
