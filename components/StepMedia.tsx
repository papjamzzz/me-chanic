'use client';

import { useRef } from 'react';
import { MediaData } from '@/lib/types';

interface StepMediaProps {
  data: MediaData;
  update: (v: Partial<MediaData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function StepMedia({
  data,
  update,
  onNext,
  onBack,
  onSkip,
}: StepMediaProps) {
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const dashRef = useRef<HTMLInputElement>(null);
  const leakRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    type: 'audio' | 'video' | 'dash' | 'leak',
    file: File | undefined
  ) => {
    update({ [type]: file });
  };

  const getFileName = (file: File | undefined): string => {
    return file?.name || '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#f0f0f0' }}>
        Add Media (optional)
      </h2>
      <p style={{ color: '#888' }} className="mb-8 text-sm">
        Upload audio, video, or photos to help us analyze your vehicle more accurately.
      </p>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Audio */}
        <div>
          <div
            style={{
              border: '2px dashed #2a2a2a',
              background: data.audio ? '#f97316' : 'transparent',
              borderColor: data.audio ? '#f97316' : '#2a2a2a',
            }}
            className="p-6 rounded-lg cursor-pointer transition-all text-center"
            onClick={() => audioRef.current?.click()}
          >
            <div className="text-3xl mb-3">🎙️</div>
            <h4 className="font-semibold mb-1" style={{ color: '#f0f0f0' }}>
              Engine Sound
            </h4>
            <p style={{ color: '#888' }} className="text-xs mb-3">
              Start-up, idle, or while driving
            </p>
            {data.audio ? (
              <p style={{ color: '#0a0a0a' }} className="text-xs font-bold">
                ✓ {getFileName(data.audio)}
              </p>
            ) : (
              <p style={{ color: '#888' }} className="text-xs">
                MP3, WAV, or M4A
              </p>
            )}
          </div>
          <input
            ref={audioRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileChange('audio', e.target.files?.[0])}
            className="hidden"
          />
        </div>

        {/* Video */}
        <div>
          <div
            style={{
              border: '2px dashed #2a2a2a',
              background: data.video ? '#f97316' : 'transparent',
              borderColor: data.video ? '#f97316' : '#2a2a2a',
            }}
            className="p-6 rounded-lg cursor-pointer transition-all text-center"
            onClick={() => videoRef.current?.click()}
          >
            <div className="text-3xl mb-3">🎥</div>
            <h4 className="font-semibold mb-1" style={{ color: '#f0f0f0' }}>
              Under-Hood Video
            </h4>
            <p style={{ color: '#888' }} className="text-xs mb-3">
              30 sec clip at idle
            </p>
            {data.video ? (
              <p style={{ color: '#0a0a0a' }} className="text-xs font-bold">
                ✓ {getFileName(data.video)}
              </p>
            ) : (
              <p style={{ color: '#888' }} className="text-xs">
                MP4 or MOV
              </p>
            )}
          </div>
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange('video', e.target.files?.[0])}
            className="hidden"
          />
        </div>

        {/* Dash Photo */}
        <div>
          <div
            style={{
              border: '2px dashed #2a2a2a',
              background: data.dash ? '#f97316' : 'transparent',
              borderColor: data.dash ? '#f97316' : '#2a2a2a',
            }}
            className="p-6 rounded-lg cursor-pointer transition-all text-center"
            onClick={() => dashRef.current?.click()}
          >
            <div className="text-3xl mb-3">📸</div>
            <h4 className="font-semibold mb-1" style={{ color: '#f0f0f0' }}>
              Dashboard Photo
            </h4>
            <p style={{ color: '#888' }} className="text-xs mb-3">
              Show all warning lights
            </p>
            {data.dash ? (
              <p style={{ color: '#0a0a0a' }} className="text-xs font-bold">
                ✓ {getFileName(data.dash)}
              </p>
            ) : (
              <p style={{ color: '#888' }} className="text-xs">
                JPG or PNG
              </p>
            )}
          </div>
          <input
            ref={dashRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange('dash', e.target.files?.[0])}
            className="hidden"
          />
        </div>

        {/* Leak/Damage Photo */}
        <div>
          <div
            style={{
              border: '2px dashed #2a2a2a',
              background: data.leak ? '#f97316' : 'transparent',
              borderColor: data.leak ? '#f97316' : '#2a2a2a',
            }}
            className="p-6 rounded-lg cursor-pointer transition-all text-center"
            onClick={() => leakRef.current?.click()}
          >
            <div className="text-3xl mb-3">💧</div>
            <h4 className="font-semibold mb-1" style={{ color: '#f0f0f0' }}>
              Leak / Damage Photo
            </h4>
            <p style={{ color: '#888' }} className="text-xs mb-3">
              Any visible fluid or wear
            </p>
            {data.leak ? (
              <p style={{ color: '#0a0a0a' }} className="text-xs font-bold">
                ✓ {getFileName(data.leak)}
              </p>
            ) : (
              <p style={{ color: '#888' }} className="text-xs">
                JPG or PNG
              </p>
            )}
          </div>
          <input
            ref={leakRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange('leak', e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </div>

      {/* Pro Tip */}
      <div
        className="p-4 rounded-lg mb-8"
        style={{
          background: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.3)',
        }}
      >
        <p style={{ color: '#f0f0f0' }} className="text-sm">
          💡 <strong>Pro tip:</strong> Record your engine sound and open it in Audacity (free) to
          generate a spectrogram image, then upload it as a photo for better audio analysis.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center gap-4">
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
          onClick={onSkip}
          style={{ color: '#f97316' }}
          className="px-6 py-3 rounded font-bold text-sm underline"
        >
          Skip & Diagnose
        </button>

        <button
          onClick={onNext}
          style={{ background: '#f97316', color: '#0a0a0a' }}
          className="px-8 py-3 rounded font-bold"
        >
          RUN DIAGNOSIS →
        </button>
      </div>
    </div>
  );
}
