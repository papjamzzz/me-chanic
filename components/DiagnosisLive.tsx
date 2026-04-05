'use client';

import { useEffect, useRef, useState } from 'react';

interface Event {
  id: number;
  type: 'vision' | 'audio' | 'model' | 'arbitration' | 'start' | 'done' | 'error';
  model?: string;
  message: string;
  ts: number;
}

interface Props {
  events: Event[];
  spectrogramCanvas: HTMLCanvasElement | null;
  vehicle: { year: string; make: string; model: string };
  fileCount: number;
  hasAudio: boolean;
}

const MODEL_COLORS: Record<string, string> = {
  claude:  '#c96442',
  gpt:     '#10a37f',
  gemini:  '#4285f4',
  demo:    '#888',
};

const TYPE_ICONS: Record<string, string> = {
  start:       '⚡',
  vision:      '👁',
  audio:       '🎵',
  model:       '🤖',
  arbitration: '⚖️',
  done:        '✅',
  error:       '❌',
};

const SCAN_LINES = Array.from({ length: 12 }, (_, i) => i);

export default function DiagnosisLive({ events, spectrogramCanvas, vehicle, fileCount, hasAudio }: Props) {
  const feedRef   = useRef<HTMLDivElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);
  const [tick, setTick] = useState(0);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events]);

  // Pulse ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  // Render spectrogram canvas into img
  useEffect(() => {
    if (spectrogramCanvas && imgRef.current) {
      imgRef.current.src = spectrogramCanvas.toDataURL('image/png');
    }
  }, [spectrogramCanvas]);

  const isDone  = events.some(e => e.type === 'done');
  const isError = events.some(e => e.type === 'error');
  const activeModels = [...new Set(events.filter(e => e.type === 'model').map(e => e.model!))];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#050505',
      display: 'grid',
      gridTemplateColumns: '280px 1fr 320px',
      gridTemplateRows: '60px 1fr',
      zIndex: 50,
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        gridColumn: '1 / -1',
        background: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 20,
      }}>
        {/* Status dot */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: isDone ? '#22c55e' : isError ? '#ef4444' : '#f97316',
          boxShadow: isDone ? '0 0 10px #22c55e' : isError ? '0 0 10px #ef4444' : `0 0 ${8 + (tick % 6)}px #f97316`,
          transition: 'box-shadow 0.08s',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#f97316', letterSpacing: 1 }}>
          ME-CHANIC
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#444', letterSpacing: 0.5 }}>
          DIAGNOSTIC ENGINE
        </span>
        <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#333' }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: isDone ? '#22c55e' : '#f97316' }}>
          {isDone ? '● COMPLETE' : isError ? '● ERROR' : '● ANALYZING'}
        </div>
      </div>

      {/* ── LEFT: INPUT SUMMARY ── */}
      <div style={{
        background: '#080808',
        borderRight: '1px solid #111',
        padding: 20,
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <Section label="INPUTS RECEIVED">
          <InfoRow label="Images" value={`${fileCount} file${fileCount !== 1 ? 's' : ''}`} ok={fileCount > 0} />
          <InfoRow label="Audio" value={hasAudio ? 'Uploaded' : 'None'} ok={hasAudio} dim={!hasAudio} />
          <InfoRow label="Vehicle" value={`${vehicle.year} ${vehicle.make}`} ok={!!vehicle.year} />
        </Section>

        <Section label="MODELS">
          {['claude', 'gpt', 'gemini'].map(m => {
            const active = activeModels.includes(m);
            const labels: Record<string, string> = { claude: 'Claude Sonnet', gpt: 'GPT-4o', gemini: 'Gemini 1.5' };
            return (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: active ? MODEL_COLORS[m] : '#1a1a1a',
                  boxShadow: active ? `0 0 8px ${MODEL_COLORS[m]}` : 'none',
                  transition: 'all 0.3s',
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: active ? '#ccc' : '#333' }}>
                  {labels[m]}
                </span>
                {active && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: MODEL_COLORS[m], fontFamily: 'monospace' }}>
                    ●
                  </span>
                )}
              </div>
            );
          })}
        </Section>

        <Section label="5i ENGINE">
          <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', lineHeight: 1.7 }}>
            Consensus arbitration across all models. Identifies agreement, flags contradictions, produces unified verdict.
          </div>
        </Section>

        {/* Scan line animation */}
        <div style={{ marginTop: 'auto', opacity: isDone ? 0 : 1, transition: 'opacity 0.5s' }}>
          {SCAN_LINES.map(i => (
            <div key={i} style={{
              height: 1,
              background: `rgba(249,115,22,${0.03 + ((tick + i * 3) % 20) / 20 * 0.06})`,
              marginBottom: 3,
            }} />
          ))}
        </div>
      </div>

      {/* ── CENTER: SPECTROGRAM / VISUAL ── */}
      <div style={{
        background: '#050505',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 20, overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Animated grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {spectrogramCanvas ? (
          <>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#333', letterSpacing: 2, alignSelf: 'flex-start' }}>
              FREQUENCY SPECTROGRAM — AI READING
            </div>
            <div style={{
              width: '100%', position: 'relative',
              border: '1px solid #1a1a1a',
              borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 0 40px rgba(249,115,22,0.08)',
            }}>
              <img ref={imgRef} style={{ width: '100%', display: 'block', imageRendering: 'crisp-edges' }} alt="spectrogram" />
              {/* Animated scan line over spectrogram */}
              {!isDone && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: 2,
                  background: 'rgba(249,115,22,0.6)',
                  boxShadow: '0 0 8px #f97316',
                  left: `${(tick * 1.2) % 100}%`,
                  transition: 'left 0.08s linear',
                  pointerEvents: 'none',
                }} />
              )}
            </div>

            {/* Frequency zone annotations */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { label: 'MISFIRE', hz: '80–200Hz',  color: '#f97316' },
                { label: 'KNOCK',   hz: '200–500Hz', color: '#ef4444' },
                { label: 'EXHAUST', hz: '500Hz–1k',  color: '#00d4aa' },
                { label: 'BEARING', hz: '1k–3kHz',   color: '#f0c030' },
              ].map(z => (
                <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 2, background: z.color, borderRadius: 1 }} />
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', letterSpacing: 0.5 }}>
                    {z.label} {z.hz}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* No audio — animated logo + status */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 64, marginBottom: 24,
              filter: isDone ? 'none' : `drop-shadow(0 0 ${16 + (tick % 8) * 2}px rgba(249,115,22,0.4))`,
              transition: 'filter 0.08s',
            }}>
              🔧
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#f97316', letterSpacing: 2 }}>
              {isDone ? 'DIAGNOSIS COMPLETE' : 'ANALYZING'}
            </div>
            {!isDone && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: 4,
                    height: 4 + ((tick + i * 4) % 16),
                    background: '#f97316',
                    borderRadius: 2,
                    opacity: 0.4 + ((tick + i * 4) % 16) / 16 * 0.6,
                    transition: 'height 0.08s, opacity 0.08s',
                  }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: LIVE ACTIVITY FEED ── */}
      <div style={{
        background: '#080808',
        borderLeft: '1px solid #111',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #111',
          fontFamily: 'monospace', fontSize: 10,
          color: '#333', letterSpacing: 1,
        }}>
          ACTIVITY LOG
        </div>

        <div ref={feedRef} style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {events.map(ev => (
            <div key={ev.id} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              animation: 'slideIn 0.2s ease-out',
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{TYPE_ICONS[ev.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {ev.model && (
                  <div style={{
                    fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                    color: MODEL_COLORS[ev.model] || '#888',
                    letterSpacing: 0.5, marginBottom: 2,
                    textTransform: 'uppercase',
                  }}>
                    {ev.model}
                  </div>
                )}
                <div style={{
                  fontSize: 12, color: ev.type === 'done' ? '#22c55e' : ev.type === 'error' ? '#ef4444' : '#aaa',
                  lineHeight: 1.5, fontFamily: ev.type === 'model' ? 'monospace' : 'inherit',
                  wordBreak: 'break-word',
                }}>
                  {ev.message}
                </div>
                <div style={{ fontSize: 9, color: '#2a2a2a', fontFamily: 'monospace', marginTop: 2 }}>
                  {new Date(ev.ts).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Blinking cursor while running */}
          {!isDone && !isError && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>⚡</span>
              <div style={{
                width: 8, height: 14,
                background: '#f97316',
                animation: 'blink 1s step-end infinite',
              }} />
            </div>
          )}
        </div>

        {/* Bottom status */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #111',
          fontFamily: 'monospace', fontSize: 10,
          color: isDone ? '#22c55e' : '#f97316',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isDone ? '#22c55e' : '#f97316',
            boxShadow: isDone ? '0 0 6px #22c55e' : `0 0 ${4 + (tick % 4)}px #f97316`,
          }} />
          {isDone ? 'COMPLETE — BUILDING REPORT' : `PROCESSING · ${events.length} events`}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
        color: '#333', letterSpacing: 1.5, marginBottom: 10,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, ok, dim }: { label: string; value: string; ok: boolean; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#333' }}>{label}</span>
      <span style={{
        fontFamily: 'monospace', fontSize: 11,
        color: dim ? '#2a2a2a' : ok ? '#ccc' : '#555',
      }}>{value}</span>
    </div>
  );
}
