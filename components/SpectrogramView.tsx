'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  file: File;
  onSpectrogramReady?: (canvas: HTMLCanvasElement) => void;
}

// Diagnostic frequency zones for 2D overlay
const FREQ_ZONES = [
  { label: 'Rod knock',       fMin: 200,  fMax: 500,  color: 'rgba(255,60,60,0.25)' },
  { label: 'Misfire',         fMin: 80,   fMax: 200,  color: 'rgba(255,140,0,0.2)' },
  { label: 'Belt/bearing',    fMin: 1000, fMax: 3000, color: 'rgba(255,200,0,0.18)' },
  { label: 'Exhaust leak',    fMin: 500,  fMax: 1000, color: 'rgba(0,220,180,0.15)' },
];

export default function SpectrogramView({ file, onSpectrogramReady }: Props) {
  const waveRef      = useRef<HTMLDivElement>(null);
  const specRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wsRef        = useRef<any>(null);
  const [playing, setPlaying]     = useState(false);
  const [ready, setReady]         = useState(false);
  const [duration, setDuration]   = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!waveRef.current || !specRef.current || !file) return;

    let ws: any = null;
    let destroyed = false;

    (async () => {
      try {
        const WaveSurfer   = (await import('wavesurfer.js')).default;
        const Spectrogram  = (await import('wavesurfer.js/dist/plugins/spectrogram.js')).default;

        if (destroyed) return;

        ws = WaveSurfer.create({
          container:        waveRef.current!,
          waveColor:        '#f97316',
          progressColor:    '#ff6b00',
          cursorColor:      '#ffffff',
          barWidth:         2,
          barGap:           1,
          barRadius:        2,
          height:           70,
          normalize:        true,
          interact:         true,
          backend:          'WebAudio',
        });

        const spectrogramPlugin = Spectrogram.create({
          container:    specRef.current!,
          labels:       true,
          height:       180,
          frequencyMax: 8000,
          colorMap:     buildColormap(),
        });

        ws.registerPlugin(spectrogramPlugin);
        wsRef.current = ws;

        ws.on('ready', () => {
          if (destroyed) return;
          setReady(true);
          setDuration(ws.getDuration());

          // Export spectrogram canvas for vision AI
          setTimeout(() => {
            const canvas = specRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
            if (canvas && onSpectrogramReady) onSpectrogramReady(canvas);
          }, 800);
        });

        ws.on('audioprocess', (t: number) => setCurrent(t));
        ws.on('finish', () => setPlaying(false));
        ws.on('error', (e: any) => setError(String(e)));

        const url = URL.createObjectURL(file);
        ws.load(url);

        return () => { URL.revokeObjectURL(url); };
      } catch (e) {
        if (!destroyed) setError(String(e));
      }
    })();

    return () => {
      destroyed = true;
      ws?.destroy();
    };
  }, [file]);

  const togglePlay = useCallback(() => {
    if (!wsRef.current || !ready) return;
    wsRef.current.playPause();
    setPlaying(p => !p);
  }, [ready]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{
      background: '#080808',
      border: '1px solid #2a2a2a',
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: '#111',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: ready ? '#f97316' : '#333',
          boxShadow: ready ? '0 0 8px #f97316' : 'none',
          transition: 'all 0.3s',
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#888', letterSpacing: 1, fontFamily: 'monospace' }}>
          SPECTROGRAM — {file.name}
        </span>
        {ready && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        )}
      </div>

      {/* Waveform */}
      <div style={{ padding: '10px 16px 0', position: 'relative' }}>
        <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', marginBottom: 4, letterSpacing: 0.5 }}>
          WAVEFORM
        </div>
        <div ref={waveRef} style={{ width: '100%' }} />
      </div>

      {/* Spectrogram */}
      <div style={{ padding: '10px 16px', position: 'relative' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 6,
        }}>
          <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 0.5 }}>
            FREQUENCY ANALYSIS (Hz)
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {FREQ_ZONES.map(z => (
              <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color.replace('0.2', '0.8').replace('0.25', '0.9').replace('0.18', '0.8').replace('0.15', '0.8') }} />
                <span style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>{z.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div ref={specRef} style={{ width: '100%', position: 'relative' }} />
        {!ready && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(8,8,8,0.8)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', letterSpacing: 1 }}>
                {error ? `ERROR: ${error}` : 'LOADING AUDIO...'}
              </div>
              {!error && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#f97316',
                      animation: `pulse 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        padding: '10px 16px 14px',
        borderTop: '1px solid #111',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <button
          onClick={togglePlay}
          disabled={!ready}
          style={{
            background: ready ? '#f97316' : '#222',
            border: 'none', borderRadius: 6,
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: ready ? 'pointer' : 'default',
            fontSize: 14, flexShrink: 0,
            boxShadow: ready ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
            height: '100%',
            background: 'linear-gradient(90deg, #f97316, #ff6b00)',
            borderRadius: 2,
            transition: 'width 0.1s',
          }} />
        </div>

        {ready && (
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', flexShrink: 0 }}>
            {fmt(duration)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// Dark → orange → white heatmap for spectrograms
function buildColormap(): number[][] {
  const map: number[][] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    if (t < 0.25) {
      // Black → deep blue
      map.push([0, 0, Math.round(t * 4 * 80), 255]);
    } else if (t < 0.5) {
      const u = (t - 0.25) * 4;
      map.push([0, Math.round(u * 30), Math.round(80 + u * 100), 255]);
    } else if (t < 0.75) {
      const u = (t - 0.5) * 4;
      map.push([Math.round(u * 249), Math.round(30 + u * 85), Math.round(180 - u * 158), 255]);
    } else {
      const u = (t - 0.75) * 4;
      map.push([249, Math.round(115 + u * 140), Math.round(22 + u * 233), 255]);
    }
  }
  return map;
}
