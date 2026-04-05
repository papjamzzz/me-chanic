'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { VehicleData, CodesData, SymptomsData, MediaData } from '@/lib/types';

const SpectrogramView = dynamic(() => import('./SpectrogramView'), { ssr: false });

interface NHTSAResponse {
  Results: Array<{ Variable: string; Value: string | null }>;
}

interface Props {
  vehicle: VehicleData;
  codes: CodesData;
  symptoms: SymptomsData;
  media: MediaData;
  updateVehicle: (v: Partial<VehicleData>) => void;
  updateCodes: (v: Partial<CodesData>) => void;
  updateSymptoms: (v: Partial<SymptomsData>) => void;
  updateMedia: (v: Partial<MediaData>) => void;
  onDiagnose: () => void;
  onSpectrogramReady?: (canvas: HTMLCanvasElement) => void;
}

const SYMPTOM_CHIPS = [
  { id: 'noise',      label: '🔊 Noise',           desc: 'Knocking, rattling, squealing' },
  { id: 'stall',      label: '💀 Stalling',         desc: 'Dies at idle or stop' },
  { id: 'rough',      label: '⚡ Rough idle',       desc: 'Shaking, misfiring at idle' },
  { id: 'power',      label: '📉 Loss of power',    desc: 'Sluggish acceleration' },
  { id: 'smoke',      label: '💨 Smoke',            desc: 'White, blue, or black' },
  { id: 'heat',       label: '🌡️ Overheating',      desc: 'Temp gauge rising' },
  { id: 'leak',       label: '💧 Leaking',          desc: 'Fluid under the car' },
  { id: 'vibration',  label: '〰️ Vibration',        desc: 'Shaking while driving' },
  { id: 'brake',      label: '🛑 Brake issues',     desc: 'Grinding, pulling, soft pedal' },
  { id: 'electrical', label: '🔌 Electrical',       desc: 'Lights, windows, starting' },
  { id: 'smell',      label: '👃 Smell',            desc: 'Burning, sulfur, fuel' },
  { id: 'nostart',    label: '🔑 Won\'t start',     desc: 'Cranks but won\'t fire' },
];

const WHEN_OPTIONS = [
  'Cold start only', 'When warm', 'While idling', 'While accelerating',
  'At highway speed', 'All the time', 'Intermittently', 'After hard braking',
];

const FILE_ACCEPT = 'image/*,audio/*,video/*,.pdf,.txt,.csv';

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return '🖼️';
  if (file.type.startsWith('audio/')) return '🎵';
  if (file.type.startsWith('video/')) return '🎥';
  return '📄';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function DiagnosticConsole({
  vehicle, codes, symptoms, media,
  updateVehicle, updateCodes, updateSymptoms, updateMedia,
  onDiagnose, onSpectrogramReady,
}: Props) {
  const [vinLoading, setVinLoading] = useState(false);
  const [vinStatus, setVinStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<File[]>([]);
  const [rawCodes, setRawCodes] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── VIN lookup ───────────────────────────────────────────────────────────────
  const handleVinLookup = async () => {
    const vin = vehicle.vin.trim().toUpperCase();
    if (vin.length < 10) return;
    setVinLoading(true);
    setVinStatus('idle');
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
      const d: NHTSAResponse = await res.json();
      const get = (v: string) => d.Results.find(r => r.Variable === v)?.Value || '';
      const year = get('Model Year'), make = get('Make'), model = get('Model');
      if (!year || !make || !model) { setVinStatus('err'); return; }
      updateVehicle({ year, make, model, engine: get('Engine Description') });
      setVinStatus('ok');
    } catch { setVinStatus('err'); }
    finally { setVinLoading(false); }
  };

  // ── Code parsing ─────────────────────────────────────────────────────────────
  const handleCodesChange = (raw: string) => {
    setRawCodes(raw);
    const tokens = raw.toUpperCase().split(/[\s,;|\n]+/).filter(t => /^[A-Z]\d{4}$/.test(t));
    const dtcs = tokens.filter(t => !t.startsWith('U') && !t.startsWith('B'));
    updateCodes({ dtcs });
  };

  // ── Symptom chips ────────────────────────────────────────────────────────────
  const toggleSymptom = (id: string) => {
    const current = symptoms.issues;
    const next = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
    updateSymptoms({ issues: next });
  };

  // ── File drop zone ───────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const next = [...uploads, ...arr];
    setUploads(next);

    // Wire known types into media
    const audio = next.find(f => f.type.startsWith('audio/'));
    const video = next.find(f => f.type.startsWith('video/'));
    const images = next.filter(f => f.type.startsWith('image/'));
    updateMedia({
      audio,
      video,
      dash: images[0],
      leak: images[1],
      screenshots: images,
    } as Partial<MediaData>);
  }, [uploads, updateMedia]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (idx: number) => {
    const next = uploads.filter((_, i) => i !== idx);
    setUploads(next);
    const audio = next.find(f => f.type.startsWith('audio/'));
    const video = next.find(f => f.type.startsWith('video/'));
    const images = next.filter(f => f.type.startsWith('image/'));
    updateMedia({ audio, video, dash: images[0], leak: images[1] });
  };

  const hasEnough = !!(vehicle.year && vehicle.make) || uploads.length > 0 || rawCodes.trim() || symptoms.issues.length > 0;

  // ── Styles ───────────────────────────────────────────────────────────────────
  const S = {
    bg:      '#0d0d0d',
    surface: '#1a1a1a',
    panel:   '#1f1f1f',
    border:  '#333333',
    orange:  '#f97316',
    dim:     '#b0b0b0',
    text:    '#ffffff',
    input: {
      background: '#111111',
      border: '1px solid #333333',
      color: '#ffffff',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 17,
      width: '100%',
      outline: 'none',
    } as React.CSSProperties,
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = S.orange;
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = S.border;
  };

  return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: '0 0 80px' }}>

      {/* ── TOP BAR: vehicle ── */}
      <div style={{
        background: S.surface,
        borderBottom: `1px solid ${S.border}`,
        padding: '16px 24px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}>
        {/* VIN */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 260px', minWidth: 220 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: S.dim, letterSpacing: 1, marginBottom: 5 }}>VIN</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...S.input, fontFamily: 'monospace', flex: 1 }}
                value={vehicle.vin}
                onChange={e => { updateVehicle({ vin: e.target.value.toUpperCase() }); setVinStatus('idle'); }}
                onFocus={inputFocus} onBlur={inputBlur}
                placeholder="paste VIN to auto-fill →"
              />
              <button
                onClick={handleVinLookup}
                disabled={vinLoading || vehicle.vin.length < 10}
                style={{
                  background: vinLoading ? '#333' : S.orange,
                  color: '#000', border: 'none', borderRadius: 6,
                  padding: '0 14px', fontWeight: 700, fontSize: 17,
                  cursor: 'pointer', whiteSpace: 'nowrap', opacity: vehicle.vin.length < 10 ? 0.4 : 1,
                }}
              >
                {vinLoading ? '…' : vinStatus === 'ok' ? '✓' : 'LOOKUP'}
              </button>
            </div>
          </div>
        </div>

        {/* Year / Make / Model / Miles / ZIP */}
        {[
          { key: 'year',  label: 'YEAR',   placeholder: '2018', width: 70 },
          { key: 'make',  label: 'MAKE',   placeholder: 'Toyota', width: 100 },
          { key: 'model', label: 'MODEL',  placeholder: 'Camry', width: 110 },
          { key: 'miles', label: 'MILES',  placeholder: '95,000', width: 90 },
          { key: 'zip',   label: 'ZIP',    placeholder: '90210', width: 80 },
        ].map(({ key, label, placeholder, width }) => (
          <div key={key} style={{ minWidth: width }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: S.dim, letterSpacing: 1, marginBottom: 5 }}>{label}</div>
            <input
              style={{ ...S.input, width }}
              value={vehicle[key as keyof VehicleData]}
              onChange={e => updateVehicle({ [key]: e.target.value } as Partial<VehicleData>)}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder={placeholder}
            />
          </div>
        ))}

        {/* CEL toggle */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: S.dim, letterSpacing: 1, marginBottom: 5 }}>CHECK ENGINE</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['on', 'off', 'other'] as const).map(v => (
              <button key={v} onClick={() => updateCodes({ cel: v })} style={{
                padding: '8px 12px', borderRadius: 6, border: `1px solid ${codes.cel === v ? S.orange : S.border}`,
                background: codes.cel === v ? `rgba(249,115,22,0.15)` : 'transparent',
                color: codes.cel === v ? S.orange : S.dim,
                fontSize: 17, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
              }}>{v}</button>
            ))}
          </div>
        </div>

        {/* Diagnose button */}
        <button
          onClick={onDiagnose}
          disabled={!hasEnough}
          style={{
            marginLeft: 'auto',
            background: hasEnough ? S.orange : '#333',
            color: hasEnough ? '#000' : S.dim,
            border: 'none', borderRadius: 8,
            padding: '12px 28px', fontWeight: 800,
            fontSize: 18, cursor: hasEnough ? 'pointer' : 'not-allowed',
            letterSpacing: 0.5, whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          DIAGNOSE →
        </button>
      </div>

      {/* ── THREE-COLUMN CONSOLE ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr 1fr',
        gap: 1,
        background: S.border,
        minHeight: 'calc(100vh - 160px)',
      }}>

        {/* ── LEFT: OBD DATA ── */}
        <div style={{ background: S.bg, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: S.text, letterSpacing: 1.5, marginBottom: 14, textTransform: 'uppercase' }}>
              OBD / Scanner Data
            </div>

            {/* Fault codes */}
            <label style={{ fontSize: 17, fontWeight: 700, color: S.text, display: 'block', marginBottom: 6 }}>
              Fault Codes
            </label>
            <textarea
              value={rawCodes}
              onChange={e => handleCodesChange(e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder={'P0300 P0420\nor one per line\nor paste from app'}
              style={{
                ...S.input,
                minHeight: 90, resize: 'vertical', fontFamily: 'monospace',
                fontSize: 16, lineHeight: 1.6,
              } as React.CSSProperties}
            />
            {codes.dtcs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {codes.dtcs.map(c => (
                  <span key={c} style={{
                    background: 'rgba(249,115,22,0.15)', color: S.orange,
                    border: `1px solid rgba(249,115,22,0.3)`,
                    borderRadius: 4, padding: '2px 8px', fontSize: 17, fontFamily: 'monospace', fontWeight: 700,
                  }}>{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Freeze frame */}
          <div>
            <label style={{ fontSize: 17, fontWeight: 700, color: S.text, display: 'block', marginBottom: 6 }}>
              Freeze Frame / Live Data
            </label>
            <textarea
              value={codes.freezeFrame}
              onChange={e => updateCodes({ freezeFrame: e.target.value })}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder={'RPM: 850\nCoolant: 195°F\nMAF: 3.2 g/s\n...paste anything'}
              style={{
                ...S.input,
                minHeight: 110, resize: 'vertical', fontFamily: 'monospace', fontSize: 17, lineHeight: 1.7,
              } as React.CSSProperties}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 17, fontWeight: 700, color: S.text, display: 'block', marginBottom: 6 }}>
              Notes / Recent Work
            </label>
            <textarea
              value={symptoms.notes}
              onChange={e => updateSymptoms({ notes: e.target.value })}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder={'Just replaced brake pads.\nHappens when cold.\nGot worse after rain...'}
              style={{
                ...S.input,
                minHeight: 90, resize: 'vertical', fontSize: 16, lineHeight: 1.6,
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* ── CENTER: DROP ZONE ── */}
        <div style={{ background: S.bg, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.text, letterSpacing: 1.5, marginBottom: 0, textTransform: 'uppercase' }}>
            Upload Everything
          </div>

          {/* Spectrogram — shown when audio is uploaded */}
          {media.audio && (
            <SpectrogramView
              file={media.audio}
              onSpectrogramReady={onSpectrogramReady}
            />
          )}

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? S.orange : S.border}`,
              borderRadius: 10,
              background: dragging ? 'rgba(249,115,22,0.06)' : S.surface,
              padding: media.audio ? '16px 20px' : '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flex: uploads.length === 0 && !media.audio ? 1 : 'none',
            }}
          >
            <div style={{ fontSize: media.audio ? 28 : 44, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: media.audio ? 14 : 18, fontWeight: 700, color: S.text, marginBottom: 4 }}>
              {media.audio ? 'Add more files' : 'Drop anything here'}
            </div>
            {!media.audio && (
              <div style={{ fontSize: 16, color: S.dim, lineHeight: 1.7 }}>
                OBD screenshots · engine audio · dashboard photos<br />
                under-hood video · scan tool exports
              </div>
            )}
            <div style={{
              marginTop: 10,
              display: 'inline-block',
              background: 'rgba(249,115,22,0.12)',
              color: S.orange,
              border: `1px solid rgba(249,115,22,0.3)`,
              borderRadius: 6, padding: '6px 16px',
              fontSize: 14, fontWeight: 700,
            }}>
              + Choose Files
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
          </div>

          {/* Uploaded files list */}
          {uploads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {uploads.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: S.surface, border: `1px solid ${S.border}`,
                  borderRadius: 6, padding: '8px 12px',
                }}>
                  <span style={{ fontSize: 18 }}>{getFileIcon(f)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: S.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: 16, color: S.dim }}>{formatSize(f.size)}</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={{
                    background: 'none', border: 'none', color: S.dim,
                    cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 6px',
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Phone tip */}
          <div style={{
            background: 'rgba(249,115,22,0.07)',
            border: `1px solid rgba(249,115,22,0.2)`,
            borderRadius: 8, padding: '14px 16px',
            marginTop: 'auto',
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: S.orange, marginBottom: 8, letterSpacing: 0.5 }}>
              📱 Using your phone?
            </div>
            <div style={{ fontSize: 17, color: S.dim, lineHeight: 1.75 }}>
              <span style={{ color: S.text, fontWeight: 600 }}>1.</span> Open your OBD app → screenshot the codes<br />
              <span style={{ color: S.text, fontWeight: 600 }}>2.</span> Record engine sounds with your voice memo app<br />
              <span style={{ color: S.text, fontWeight: 600 }}>3.</span> Photo your dashboard warning lights<br />
              <span style={{ color: S.text, fontWeight: 600 }}>4.</span> Transfer files here and drop them above
            </div>
          </div>
        </div>

        {/* ── RIGHT: SYMPTOMS ── */}
        <div style={{ background: S.bg, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: S.text, letterSpacing: 1.5, marginBottom: 14, textTransform: 'uppercase' }}>
              What's Wrong?
            </div>

            {/* Symptom chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {SYMPTOM_CHIPS.map(({ id, label }) => {
                const active = symptoms.issues.includes(id);
                return (
                  <button key={id} onClick={() => toggleSymptom(id)} style={{
                    padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${active ? S.orange : S.border}`,
                    background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
                    color: active ? S.orange : S.dim,
                    fontSize: 17, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* When */}
          <div>
            <label style={{ fontSize: 17, fontWeight: 700, color: S.text, display: 'block', marginBottom: 8 }}>
              When does it happen?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WHEN_OPTIONS.map(w => {
                const active = symptoms.when === w;
                return (
                  <button key={w} onClick={() => updateSymptoms({ when: active ? '' : w })} style={{
                    padding: '5px 10px', borderRadius: 5,
                    border: `1px solid ${active ? S.orange : S.border}`,
                    background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                    color: active ? S.orange : S.dim,
                    fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  }}>{w}</button>
                );
              })}
            </div>
          </div>

          {/* Describe */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 17, fontWeight: 700, color: S.text, display: 'block', marginBottom: 6 }}>
              Describe in your own words
            </label>
            <textarea
              value={symptoms.recentWork}
              onChange={e => updateSymptoms({ recentWork: e.target.value })}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder={'My car makes a rattling sound when I accelerate above 40mph. It started last week after I filled up with gas...'}
              style={{
                ...S.input,
                flex: 1, minHeight: 140, resize: 'none', fontSize: 16, lineHeight: 1.7,
              } as React.CSSProperties}
            />
          </div>

          {/* Readiness indicator */}
          <div style={{
            background: S.surface, border: `1px solid ${S.border}`,
            borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.dim, marginBottom: 10, letterSpacing: 0.5 }}>
              CONSOLE STATUS
            </div>
            {[
              { label: 'Vehicle',  done: !!(vehicle.year && vehicle.make) },
              { label: 'OBD Data', done: codes.dtcs.length > 0 || !!codes.freezeFrame },
              { label: 'Files',    done: uploads.length > 0 },
              { label: 'Symptoms', done: symptoms.issues.length > 0 || !!symptoms.recentWork },
            ].map(({ label, done }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: done ? '#22c55e' : S.border,
                  boxShadow: done ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 17, color: done ? S.text : S.dim, fontWeight: done ? 600 : 400 }}>
                  {label}
                </span>
                <span style={{ fontSize: 16, color: done ? '#22c55e' : S.dim, marginLeft: 'auto' }}>
                  {done ? 'ready' : 'optional'}
                </span>
              </div>
            ))}

            <button
              onClick={onDiagnose}
              disabled={!hasEnough}
              style={{
                width: '100%', marginTop: 12,
                background: hasEnough ? S.orange : '#222',
                color: hasEnough ? '#000' : S.dim,
                border: 'none', borderRadius: 6,
                padding: '12px', fontWeight: 800,
                fontSize: 17, cursor: hasEnough ? 'pointer' : 'not-allowed',
                letterSpacing: 0.5, transition: 'all 0.15s',
              }}
            >
              {hasEnough ? 'RUN DIAGNOSIS →' : 'ADD SOME DATA ABOVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
