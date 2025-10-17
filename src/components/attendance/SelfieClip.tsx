'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';

type SelfieClipProps = {
  attendanceId: string;
  variant?: 'button' | 'icon';
};

export default function SelfieClip({ attendanceId, variant = 'button' }: SelfieClipProps) {
  const [open, setOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchUrl = async () => {
    try {
      setLoading(true);
      setErr(null);
      const r = await fetch(`/endpoints/selfie-url?attendance_id=${attendanceId}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se pudo firmar la URL');
      setImgUrl(j.url);
      setOpen(true);
    } catch (e: any) {
      setErr(e?.message || 'Error cargando selfie');
    } finally {
      setLoading(false);
    }
  };

  const title = err ? `Error: ${err}` : 'Ver selfie';

  const trigger = variant === 'icon'
    ? (
      <button
        type="button"
        onClick={fetchUrl}
        title={title}
        style={{
          width: 28,
          height: 28,
          borderRadius: '9999px',
          border: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(148,163,184,0.08)',
          color: '#e2e8f0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
      </button>
    ) : (
      <button
        type="button"
        onClick={fetchUrl}
        title={title}
        style={{
          border: '1px solid rgba(148,163,184,.25)',
          background: 'rgba(15,23,42,.7)',
          color: '#e5e7eb',
          padding: '6px 10px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        {loading ? '…' : '📎 Selfie'}
      </button>
    );

  return (
    <>
      {trigger}
      {variant !== 'icon' && err && (
        <span style={{ color: '#f87171', fontSize: 12, marginLeft: 8 }}>{err}</span>
      )}

      {open && imgUrl && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(10,12,24,.94)',
              border: '1px solid rgba(148,163,184,.25)',
              borderRadius: 18,
              padding: 20,
              width: 'min(96vw, 900px)',
              maxHeight: '92vh',
              boxShadow: '0 24px 70px rgba(0,0,0,.45)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <strong style={{ color: '#e5e7eb' }}>Selfie del marcaje</strong>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <Image
              src={imgUrl}
              alt="Selfie asistencia"
              width={900}
              height={600}
              style={{ width: '100%', height: 'auto', maxHeight: '78vh', objectFit: 'contain', borderRadius: 12, display: 'block' }}
              unoptimized
            />
            <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 12, textAlign: 'right' }}>
              *La URL expira en ~2 minutos por seguridad.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
