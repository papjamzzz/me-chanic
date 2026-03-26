'use client';

export default function Header() {
  return (
    <header
      style={{
        background: '#111111',
        borderBottom: '1px solid #2a2a2a',
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🔧</span>
          <span style={{ color: '#f0f0f0' }}>ME</span>
          <span style={{ color: '#f97316' }}>-CHANIC</span>
        </div>

        {/* Right: Badge */}
        <div
          style={{
            background: '#f97316',
            color: '#0a0a0a',
          }}
          className="px-4 py-2 rounded-full text-xs font-bold tracking-wide"
        >
          AI VEHICLE TRIAGE · FREE BETA
        </div>
      </div>
    </header>
  );
}
