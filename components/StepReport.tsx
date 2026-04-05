'use client';

import { DiagnosisResult, VehicleData } from '@/lib/types';
import { useState } from 'react';

interface StepReportProps {
  result: DiagnosisResult;
  vehicle: VehicleData;
  onReset: () => void;
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'SAFETY CRITICAL': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '#ef4444' },
  'MONITOR':         { bg: 'rgba(234,179,8,0.10)', color: '#eab308', border: '#eab308' },
  'INFORMATIONAL':   { bg: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '#22c55e' },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:     '#22c55e',
  Moderate: '#eab308',
  Hard:     '#f97316',
  'Pro Only': '#ef4444',
};

export default function StepReport({ result, vehicle, onReset }: StepReportProps) {
  const [expandedCause, setExpandedCause] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const urgencyColor =
    result.urgency === 'high' ? '#ef4444' :
    result.urgency === 'medium' ? '#eab308' : '#22c55e';

  const safeColor =
    result.safeTodriveLabel === 'YES' ? '#22c55e' :
    result.safeTodriveLabel === 'CAUTION' ? '#eab308' : '#ef4444';

  const copyScript = () => {
    navigator.clipboard.writeText(result.shopScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const ytUrl = (query: string) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px', color: '#f0f0f0' }}>

      {/* ── VERDICT BANNER ── */}
      <div style={{
        background: '#0f0f0f',
        border: `1px solid ${urgencyColor}`,
        borderRadius: 12,
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: urgencyColor,
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', letterSpacing: 1.5, marginBottom: 8 }}>
              DIAGNOSIS COMPLETE — {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.miles ? ` · ${parseInt(vehicle.miles).toLocaleString()} MILES` : ''}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.4, margin: 0 }}>
              {result.verdictStatement || result.summary}
            </h1>
            {result.modelsUsed && result.modelsUsed[0] !== 'demo' && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
                MODELS: {result.modelsUsed.map(m => m.toUpperCase()).join(' · ')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
            <div style={{
              background: urgencyColor,
              color: '#000',
              padding: '6px 14px',
              borderRadius: 6,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1,
              fontFamily: 'monospace',
            }}>
              {result.urgencyLabel}
            </div>
            <div style={{
              border: `1px solid ${safeColor}`,
              color: safeColor,
              padding: '5px 14px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 1,
              fontFamily: 'monospace',
            }}>
              SAFE TO DRIVE: {result.safeTodriveLabel}
            </div>
          </div>
        </div>
      </div>

      {/* ── DO NOT DRIVE WARNING ── */}
      {result.doNotDrive.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '2px solid #ef4444',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 24,
        }}>
          <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 16, marginBottom: 8 }}>
            ⛔ DO NOT DRIVE THIS VEHICLE
          </div>
          {result.doNotDrive.map((d, i) => (
            <div key={i} style={{ color: '#f87171', fontSize: 14, marginTop: 4 }}>• {d}</div>
          ))}
        </div>
      )}

      {/* ── CAUSES ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader label="RANKED CAUSES" sub={`${result.causes.length} found — click to expand`} />

        {result.causes.map((cause, idx) => {
          const ps = PRIORITY_STYLE[cause.priority || 'MONITOR'];
          const isOpen = expandedCause === idx;

          return (
            <div
              key={cause.rank}
              style={{
                background: isOpen ? '#0f0f0f' : '#090909',
                border: `1px solid ${isOpen ? '#2a2a2a' : '#181818'}`,
                borderRadius: 10,
                marginBottom: 10,
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}
            >
              {/* Cause header — always visible */}
              <button
                onClick={() => setExpandedCause(isOpen ? null : idx)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  textAlign: 'left',
                }}
              >
                {/* Rank badge */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: cause.rank === 1 ? '#f97316' : '#1a1a1a',
                  color: cause.rank === 1 ? '#000' : '#f97316',
                  border: cause.rank === 1 ? 'none' : '1px solid #f97316',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                }}>
                  {cause.rank}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{cause.name}</span>
                    {cause.priority && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                        background: ps.bg, color: ps.color,
                        border: `1px solid ${ps.border}`,
                        borderRadius: 4, padding: '2px 7px',
                        fontFamily: 'monospace',
                      }}>
                        {cause.priority}
                      </span>
                    )}
                    {cause.models_agree && (
                      <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Models agree</span>
                    )}
                  </div>

                  {/* Confidence bar inline */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
                      <div style={{
                        width: `${cause.confidence}%`, height: '100%',
                        background: cause.rank === 1 ? '#f97316' : '#555',
                        borderRadius: 2,
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', flexShrink: 0 }}>
                      {cause.confidence}% likely
                    </span>
                  </div>
                </div>

                {/* Cost preview */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Parts</div>
                  <div style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{cause.parts}</div>
                </div>

                <div style={{ color: '#555', fontSize: 18, flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1a1a1a' }}>

                  {/* Why */}
                  <div style={{ padding: '16px 0 12px', fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
                    {cause.why}
                  </div>

                  {/* Cost + Parts grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
                    <InfoBox label="PARTS" value={cause.parts} accent="#f97316" />
                    <InfoBox label="LABOR" value={cause.labor} accent="#f97316" />
                    {cause.diyDifficulty && (
                      <InfoBox label="DIY DIFFICULTY" value={cause.diyDifficulty} accent={DIFFICULTY_COLOR[cause.diyDifficulty] || '#888'} />
                    )}
                    {cause.timeEstimate && (
                      <InfoBox label="TIME ESTIMATE" value={cause.timeEstimate} accent="#888" />
                    )}
                  </div>

                  {/* Part numbers + where to buy */}
                  {(cause.partNumbers || cause.whereToBuy) && (
                    <div style={{
                      background: '#111', borderRadius: 8, padding: '12px 16px',
                      marginBottom: 16, fontSize: 13,
                    }}>
                      {cause.partNumbers && (
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 11 }}>PART #S: </span>
                          <span style={{ color: '#ccc' }}>{cause.partNumbers}</span>
                        </div>
                      )}
                      {cause.whereToBuy && (
                        <div>
                          <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 11 }}>BUY AT: </span>
                          <span style={{ color: '#ccc' }}>{cause.whereToBuy}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* YouTube link */}
                  {cause.youtubeQuery && (
                    <a
                      href={ytUrl(cause.youtubeQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,0,0,0.1)',
                        border: '1px solid rgba(255,0,0,0.3)',
                        color: '#ff4444',
                        padding: '8px 14px',
                        borderRadius: 7,
                        fontSize: 13, fontWeight: 600,
                        textDecoration: 'none',
                        marginBottom: 16,
                        transition: 'background 0.2s',
                      }}
                    >
                      ▶ Watch Repair Video — {cause.youtubeQuery}
                    </a>
                  )}

                  {/* DIY Steps */}
                  {cause.diySteps && cause.diySteps.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: 11, fontFamily: 'monospace', color: '#444',
                        letterSpacing: 1.5, marginBottom: 10, fontWeight: 700,
                      }}>
                        DIY REPAIR STEPS
                      </div>
                      <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                        {cause.diySteps.map((step, i) => (
                          <li key={i} style={{
                            display: 'flex', gap: 12, marginBottom: 8, fontSize: 13, color: '#bbb', lineHeight: 1.5,
                          }}>
                            <span style={{
                              flexShrink: 0, width: 22, height: 22,
                              background: '#1a1a1a', color: '#f97316',
                              borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                              marginTop: 1,
                            }}>
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── COST TABLE ── */}
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10,
        padding: '24px', marginBottom: 24,
      }}>
        <SectionHeader label="REPAIR COST ESTIMATE" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {[
            { label: 'DIY', val: result.costEstimate.diy, icon: '🔧', note: 'You buy parts, you do the work' },
            { label: 'SHOP', val: result.costEstimate.shop, icon: '🏭', note: 'Parts + labor at a local shop' },
            { label: 'WORST CASE', val: result.costEstimate.worstCase, icon: '⚠️', note: 'If root cause is more complex' },
          ].map(item => (
            <div key={item.label} style={{
              background: '#0a0a0a', border: '1px solid #222',
              borderRadius: 8, padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{item.val}</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 6, lineHeight: 1.4 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ADDITIONAL SCANS ── */}
      {result.additionalScans && result.additionalScans.length > 0 && (
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10,
          padding: '24px', marginBottom: 24,
        }}>
          <SectionHeader label="ADDITIONAL SCANS TO RUN" sub="Narrow the diagnosis further with these tests" />
          <div style={{ marginTop: 14 }}>
            {result.additionalScans.map((scan, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0',
                borderBottom: i < result.additionalScans!.length - 1 ? '1px solid #151515' : 'none',
              }}>
                <span style={{ color: '#f97316', flexShrink: 0, fontSize: 14 }}>◈</span>
                <span style={{ fontSize: 14, color: '#bbb' }}>{scan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MEDIA EVIDENCE ── */}
      {result.mediaFindings && result.mediaFindings.length > 0 && (
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10,
          padding: '24px', marginBottom: 24,
        }}>
          <SectionHeader label="EVIDENCE FROM YOUR UPLOADS" />
          <div style={{ marginTop: 14 }}>
            {result.mediaFindings.map((f, i) => (
              <div key={i} style={{
                background: '#0a0a0a', borderRadius: 7, padding: '12px 14px',
                marginBottom: 8, fontSize: 13, color: '#aaa', lineHeight: 1.6,
              }}>
                <span style={{
                  fontSize: 10, color: f.type === 'audio' ? '#f97316' : '#4285f4',
                  fontFamily: 'monospace', fontWeight: 700, marginRight: 8,
                }}>
                  {f.type === 'audio' ? '🎵 AUDIO' : '📸 IMAGE'}
                </span>
                {f.finding}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CODES ANALYZED ── */}
      {result.codesAnalyzed && result.codesAnalyzed.length > 0 && (
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10,
          padding: '20px 24px', marginBottom: 24,
        }}>
          <SectionHeader label="CODES ANALYZED" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {result.codesAnalyzed.map(code => (
              <span key={code} style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                color: '#f97316', padding: '4px 10px',
                borderRadius: 6, fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
              }}>
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SHOP SCRIPT ── */}
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10,
        padding: '24px', marginBottom: 24,
      }}>
        <SectionHeader label="WHAT TO SAY AT THE SHOP" sub="Copy this. It tells them you know what you're talking about." />
        <div style={{
          background: '#0a0a0a',
          borderLeft: '3px solid #f97316',
          borderRadius: '0 8px 8px 0',
          padding: '16px 20px',
          marginTop: 14,
          fontSize: 14, color: '#ddd', lineHeight: 1.7,
          fontStyle: 'italic',
        }}>
          "{result.shopScript}"
        </div>
        <button
          onClick={copyScript}
          style={{
            marginTop: 12,
            background: copied ? '#22c55e' : 'transparent',
            border: `1px solid ${copied ? '#22c55e' : '#333'}`,
            color: copied ? '#000' : '#888',
            padding: '8px 16px',
            borderRadius: 7,
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
        </button>
      </div>

      {/* ── DO NOT AUTHORIZE ── */}
      {result.doNotAuthorize && result.doNotAuthorizeReason && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444',
          borderRadius: 10, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>⚠️ Do Not Authorize Major Repairs Yet</div>
          <div style={{ color: '#f87171', fontSize: 14 }}>{result.doNotAuthorizeReason}</div>
        </div>
      )}

      {/* ── BOTTOM ACTIONS ── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
        <button
          onClick={onReset}
          style={{
            background: '#f97316', color: '#000',
            border: 'none', borderRadius: 8,
            padding: '12px 28px',
            fontSize: 14, fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          🔄 New Diagnosis
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 40, padding: '16px 20px',
        background: '#080808', border: '1px solid #111',
        borderRadius: 8, fontSize: 12, color: '#333', textAlign: 'center',
      }}>
        ME-CHANIC provides AI-assisted diagnostics for informational purposes only. Always consult a certified mechanic before performing repairs. Cost estimates are approximations and vary by region and vehicle condition.
      </div>

    </div>
  );
}

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
        color: '#444', letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#333', marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function InfoBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: '#0a0a0a', border: '1px solid #1a1a1a',
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  );
}
