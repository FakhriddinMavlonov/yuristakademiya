import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { t } = useTranslation();
  const target = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : '/student';

  return (
    <div className="nf-wrap">
      <style>{`
        .nf-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(1200px 600px at 30% 20%, rgba(30,45,138,.12), transparent 60%),
                      radial-gradient(900px 500px at 80% 80%, rgba(12,26,82,.10), transparent 60%),
                      linear-gradient(180deg, #F7F9FE 0%, #EEF2FB 100%);
          font-family: inherit;
        }
        .nf-card {
          max-width: 520px;
          width: 100%;
          background: var(--card);
          border-radius: 20px;
          padding: 48px 36px;
          text-align: center;
          box-shadow: 0 30px 80px -30px rgba(12,26,82,.25), 0 8px 24px -12px rgba(12,26,82,.10);
          animation: nf-rise .55s cubic-bezier(.22,1,.36,1);
          position: relative;
          overflow: hidden;
        }
        .nf-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(30,45,138,.05) 50%, transparent 70%);
          animation: nf-shine 3.5s ease-in-out infinite;
          pointer-events: none;
        }
        .nf-num {
          font-size: 120px;
          font-weight: 800;
          line-height: 1;
          background: linear-gradient(135deg, #0C1A52 0%, #1E2D8A 50%, #4F6BFF 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 8px;
          letter-spacing: -4px;
          animation: nf-pop .6s cubic-bezier(.34,1.56,.64,1);
        }
        .nf-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 8px;
        }
        .nf-sub {
          font-size: 14px;
          color: var(--muted);
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .nf-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
          opacity: .55;
        }
        .nf-orb.a { width: 14px; height: 14px; background: #4F6BFF; top: 24px; left: 30px;
          animation: nf-float 4s ease-in-out infinite; }
        .nf-orb.b { width: 10px; height: 10px; background: #FFB547; top: 60px; right: 40px;
          animation: nf-float 5s ease-in-out .4s infinite; }
        .nf-orb.c { width: 18px; height: 18px; background: #4ECB71; bottom: 30px; left: 50px;
          animation: nf-float 4.5s ease-in-out .8s infinite; }
        .nf-orb.d { width: 8px; height: 8px; background: #FF6F6F; bottom: 50px; right: 30px;
          animation: nf-float 3.8s ease-in-out 1.2s infinite; }
        .nf-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .nf-btn {
          padding: 12px 22px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .nf-btn:hover { transform: translateY(-2px); }
        .nf-btn.primary {
          background: linear-gradient(135deg, #0C1A52, #1E2D8A);
          color: #fff;
          box-shadow: 0 10px 24px -8px rgba(30,45,138,.55);
        }
        .nf-btn.primary:hover { box-shadow: 0 14px 30px -8px rgba(30,45,138,.65); }
        .nf-btn.ghost {
          background: var(--bg2);
          color: var(--ink);
        }
        .nf-btn.ghost:hover { background: var(--line-2); }

        @keyframes nf-rise { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes nf-pop { 0% { opacity: 0; transform: scale(.7); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes nf-shine { 0%, 100% { transform: translateX(-100%); } 50% { transform: translateX(100%); } }
        @keyframes nf-float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-12px) translateX(6px); } }
      `}</style>

      <div className="nf-card">
        <span className="nf-orb a" />
        <span className="nf-orb b" />
        <span className="nf-orb c" />
        <span className="nf-orb d" />

        <div className="nf-num">404</div>
        <h1 className="nf-title">{t('notFound.title')}</h1>
        <p className="nf-sub">{t('notFound.desc')}</p>

        <div className="nf-actions">
          <button className="nf-btn primary" onClick={() => navigate(target, { replace: true })}>
            {t('notFound.homeBtn')}
          </button>
          <button className="nf-btn ghost" onClick={() => navigate(-1)}>
            {t('notFound.backBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
