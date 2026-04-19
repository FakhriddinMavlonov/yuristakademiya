import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../../api';
import useStore from '../../store/useStore';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'yuristakademiyabot';

export default function Login() {
  const [tab, setTab] = useState('login');
  const navigate = useNavigate();
  const { login } = useStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    if (username && password) {
      setTab('login');
      // Auto-fill and submit
      handleAutoLogin(username, password);
    }
  }, []);

  const handleAutoLogin = async (username, password) => {
    try {
      const { user, accessToken, refreshToken } = await authApi.login({
        phoneOrEmail: username,
        password,
      });
      login(user, accessToken, refreshToken);
      navigate(user.role === 'teacher' ? '/teacher' : user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      console.error('Auto-login failed:', err);
    }
  };

  const handleLogin = (user, accessToken, refreshToken) => {
    login(user, accessToken, refreshToken);
    navigate(user.role === 'teacher' ? '/teacher' : user.role === 'admin' ? '/admin' : '/student');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0C1A52 0%,#1E2D8A 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '36px 40px',
        width: 420, boxShadow: '0 24px 60px rgba(12,26,82,0.35)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: 'var(--navy)',
          }}>YA</div>
          <div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--navy)' }}>Yurist Akademiya</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>LMS Platform</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[['login', 'Kirish'], ['register', "Ro'yxatdan o'tish"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all .15s',
                background: tab === key ? '#fff' : 'transparent',
                color: tab === key ? 'var(--navy)' : 'var(--muted)',
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}
            >{label}</button>
          ))}
        </div>

        {tab === 'login'
          ? <LoginForm onSuccess={handleLogin} />
          : <RegisterForm />
        }
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }) {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.login({ phoneOrEmail, password });
      onSuccess(user, accessToken, refreshToken);
    } catch (err) {
      setError(err?.error || err?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontFamily: 'Sora', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Tizimga kirish</h2>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="fgroup">
        <div className="flabel">Telefon, Email yoki Foydalanuvchi nomi</div>
        <input
          className="finput"
          placeholder="+998901234567 yoki email@..."
          value={phoneOrEmail}
          onChange={(e) => setPhoneOrEmail(e.target.value)}
          required
        />
      </div>
      <div className="fgroup">
        <div className="flabel">Parol</div>
        <input
          className="finput"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button className="btn btn-navy" type="submit" disabled={loading}
        style={{ justifyContent: 'center', padding: '10px', fontSize: 14, marginTop: 4 }}>
        {loading ? 'Kirilmoqda...' : 'Kirish →'}
      </button>

      <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 11, color: 'var(--muted)' }}>
        <strong>Demo o'qituvchi:</strong> teacher@ya.uz / teacher123<br />
        <strong>Demo o'quvchi:</strong> +998901111111 / student123
      </div>
    </form>
  );
}

function RegisterForm() {
  const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'yuristakademiyabot';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontFamily: 'Sora', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
        Yangi hisob
      </h2>

      <div style={{
        padding: '24px 16px',
        background: 'linear-gradient(135deg, #EFF4FF 0%, #F0E6FF 100%)',
        borderRadius: 12,
        border: '1px solid rgba(27,42,107,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🤖</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
          Ro'yxatdan o'tish juda oson!
        </div>
        <div style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.6 }}>
          Bizning Telegram botimiz sizga 1 daqiqada ro'yxatdan o'tishda yordam beradi.
        </div>
      </div>

      <a
        href={`https://t.me/${BOT_USERNAME}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '14px 16px',
          background: '#229ED9',
          color: '#fff',
          borderRadius: 10,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 15,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.background = '#1a7fb8'}
        onMouseLeave={(e) => e.target.style.background = '#229ED9'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.47c-.148.66-.537.82-1.088.51l-3-2.21-1.447 1.39c-.16.16-.295.295-.605.295l.215-3.053 5.55-5.015c.241-.215-.053-.334-.374-.12l-6.863 4.323-2.956-.923c-.643-.2-.656-.643.134-.952l11.54-4.448c.537-.194 1.006.13.834.733z" />
        </svg>
        Telegram botimiz orqali ro'yxatdan o'tish
      </a>

      <div style={{ padding: '12px 14px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}>✓</span>
        <span>Bot barcha ma'lumotlaringizni so'radi va avtomatik ravishda tizimga kiritadi.</span>
      </div>
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <div style={{
      background: 'var(--red-bg)', color: 'var(--red)',
      padding: '10px 14px', borderRadius: 8, fontSize: 13,
      border: '.5px solid rgba(229,57,53,.2)',
    }}>
      {children}
    </div>
  );
}
