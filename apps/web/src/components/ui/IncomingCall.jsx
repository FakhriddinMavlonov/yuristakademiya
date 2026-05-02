import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';

// Web Audio API ringtone — no asset file needed.
// Plays a two-tone alternating ring (like a phone call) until stopped.
const useRingtone = (active) => {
  const ctxRef = useRef(null);
  const stopRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const start = async () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();

        const ring = () => {
          if (cancelled) return;
          const t0 = ctx.currentTime;
          const playTone = (freq, start, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t0 + start);
            gain.gain.linearRampToValueAtTime(0.4, t0 + start + 0.05);
            gain.gain.setValueAtTime(0.4, t0 + start + dur - 0.1);
            gain.gain.linearRampToValueAtTime(0, t0 + start + dur);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t0 + start);
            osc.stop(t0 + start + dur);
          };
          // Classic ringtone: two short tones, then silence, repeat
          playTone(440, 0, 0.4);
          playTone(480, 0.5, 0.4);
        };
        ring();
        const interval = setInterval(ring, 1500);
        stopRef.current = () => { clearInterval(interval); ctx.close().catch(() => {}); };
      } catch (e) {
        console.warn('ringtone failed:', e);
      }
    };
    start();
    return () => {
      cancelled = true;
      try { stopRef.current?.(); } catch {}
      ctxRef.current = null;
    };
  }, [active]);
};

export default function IncomingCall() {
  const incomingMeeting = useStore((s) => s.incomingMeeting);
  const setIncomingMeeting = useStore((s) => s.setIncomingMeeting);
  const navigate = useNavigate();
  const [vibrating, setVibrating] = useState(false);

  useRingtone(!!incomingMeeting);

  // Vibrate on mobile while ringing
  useEffect(() => {
    if (!incomingMeeting) return;
    if (!navigator.vibrate) return;
    setVibrating(true);
    const intv = setInterval(() => navigator.vibrate([400, 200, 400, 800]), 1800);
    return () => { clearInterval(intv); navigator.vibrate?.(0); setVibrating(false); };
  }, [incomingMeeting]);

  // Listen for SW push messages (when SW receives push)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e) => {
      const msg = e.data;
      if (msg?.type === 'push' && msg.payload?.type === 'meeting:started') {
        setIncomingMeeting(msg.payload);
      }
      if (msg?.type === 'notification:click' && msg.payload?.meetingId) {
        navigate(`/student/meetings/${msg.payload.meetingId}`);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  if (!incomingMeeting) return null;

  const accept = () => {
    const id = incomingMeeting.meetingId;
    setIncomingMeeting(null);
    navigate(`/student/meetings/${id}`);
  };
  const decline = () => setIncomingMeeting(null);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0a1628 0%, #1a36b3 50%, #0c1a52 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
      padding: '60px 24px',
      color: '#fff',
      animation: 'incomingFade .25s ease-out',
    }}>
      <style>{`
        @keyframes incomingFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: .85; } }
        @keyframes ringRing { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,.5); } 100% { box-shadow: 0 0 0 40px rgba(255,255,255,0); } }
      `}</style>

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
          Kelayotgan qo'ng'iroq
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, fontFamily: 'Sora, sans-serif' }}>
          {incomingMeeting.teacherName || 'Ustoz'}
        </div>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          {incomingMeeting.title || 'Meeting boshlandi'}
        </div>
      </div>

      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 1.5s ease-in-out infinite, ringRing 1.5s ease-out infinite',
        fontSize: 56,
      }}>
        📹
      </div>

      <div style={{ display: 'flex', gap: 60, alignItems: 'center', marginBottom: 30 }}>
        <button
          onClick={decline}
          aria-label="Rad etish"
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#E53935', border: 'none', color: '#fff', cursor: 'pointer',
            fontSize: 28, boxShadow: '0 8px 24px rgba(229,57,53,0.4)',
            transform: 'rotate(135deg)',
          }}
        >
          📞
        </button>
        <button
          onClick={accept}
          aria-label="Qabul qilish"
          style={{
            width: 84, height: 84, borderRadius: '50%',
            background: '#0bf791', border: 'none', color: '#0a1628', cursor: 'pointer',
            fontSize: 32, boxShadow: '0 8px 24px rgba(11,247,145,0.4)',
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        >
          📞
        </button>
      </div>
    </div>
  );
}
