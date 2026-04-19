import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DailyIframe from '@daily-co/daily-js';
import { meetings as meetingsApi } from '../../api';
import useStore from '../../store/useStore';

export default function JoinMeeting() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { showToast, user } = useStore();
  const containerRef = useRef(null);
  const callFrameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let callFrame = null;
    let cancelled = false;

    const start = async () => {
      try {
        const existing = DailyIframe.getCallInstance?.();
        if (existing) {
          try { await existing.leave(); } catch (e) {}
          try { existing.destroy(); } catch (e) {}
        }

        const data = await meetingsApi.getJoinUrl(meetingId);
        if (cancelled || !containerRef.current) return;

        if (!data?.roomUrl) {
          throw new Error('Meeting xonasi yaratilmagan');
        }

        callFrame = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          showLocalVideo: true,
          showParticipantsBar: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#000',
          },
        });
        callFrameRef.current = callFrame;

        callFrame.on('left-meeting', () => {
          navigate('/student/meetings');
        });

        callFrame.on('error', (e) => {
          console.error('Daily error:', e);
          showToast('Meetingda xatolik');
        });

        const userName = user ? `${user.first_name} ${user.last_name}` : "O'quvchi";
        await callFrame.join({
          url: data.roomUrl,
          token: data.token,
          userName,
          startVideoOff: false,
          startAudioOff: false,
        });

        setLoading(false);
      } catch (e) {
        console.error('Error loading meeting:', e);
        if (!cancelled) {
          setError('Meetingga kirishda xatolik');
          setLoading(false);
          showToast("Meetingga kirishda xatolik");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (callFrame) {
        try {
          callFrame.leave();
          callFrame.destroy();
        } catch (e) {}
      }
    };
  }, [meetingId]);

  const handleExit = async () => {
    try {
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
        callFrameRef.current.destroy();
      }
    } catch (e) {}
    navigate('/student/meetings');
  };

  if (error) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>❌</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>{error}</div>
          <button className="btn btn-gold" onClick={() => navigate('/student/meetings')}>
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, background: '#000' }}>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📹</div>
            <div>Kamera yoqilmoqda...</div>
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        zIndex: 1000,
      }}>
        <button
          onClick={handleExit}
          style={{
            background: 'var(--red)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          ✕ Chiqish
        </button>
      </div>

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
