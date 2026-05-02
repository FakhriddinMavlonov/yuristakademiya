import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../../api';
import useStore from '../../store/useStore';

export default function AutoJoin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const meetingId = params.get('meetingId');
    if (!token) {
      setError('Token topilmadi');
      return;
    }
    (async () => {
      try {
        const { user, accessToken, refreshToken } = await authApi.magicExchange(token);
        login(user, accessToken, refreshToken);
        if (meetingId) navigate(`/student/meetings/${meetingId}`, { replace: true });
        else navigate('/student', { replace: true });
      } catch (e) {
        setError(e?.error || e?.message || 'Havola eskirgan. Qaytadan loginga kiring.');
      }
    })();
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0C1A52 0%,#1E2D8A 100%)',
      color: '#fff', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center',
    }}>
      {error ? (
        <>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{error}</div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#FFD700', color: '#0C1A52', border: 'none',
              borderRadius: 10, padding: '10px 22px', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, marginTop: 8,
            }}
          >Loginga kirish</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 56, animation: 'pulse 1.2s ease-in-out infinite' }}>📞</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Qo'ng'iroqqa ulanmoqda...</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Bir lahza kuting</div>
        </>
      )}
      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }`}</style>
    </div>
  );
}
