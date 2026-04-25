import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useStore from '../../store/useStore';

const LANGS = [
  { code: 'uz', flag: '🇺🇿', label: "O'zbek" },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
];

const PAGE_TITLE_KEYS = {
  '/teacher': 'nav.dashboard',
  '/teacher/courses': 'nav.courses',
  '/teacher/homework': 'topbar.homeworkCheck',
  '/teacher/library': 'nav.library',
  '/teacher/meetings': 'nav.meetings',
  '/teacher/chat': 'nav.chat',
  '/student': 'nav.dashboard',
  '/student/courses': 'nav.courses',
  '/student/meetings': 'nav.meetings',
  '/student/chat': 'topbar.askTeacher',
  '/admin': 'topbar.adminPanel',
  '/admin/users': 'nav.users',
  '/admin/messages': 'nav.telegramMessages',
  '/admin/payments': 'nav.payments',
  '/admin/salaries': 'nav.salaries',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useStore();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const titleKey = Object.entries(PAGE_TITLE_KEYS)
    .reverse()
    .find(([k]) => pathname.startsWith(k))?.[1] || null;
  const title = titleKey ? t(titleKey) : 'Yurist Akademiya';

  const showBack = pathname.split('/').length > 3;

  const currentLang = LANGS.find((l) => l.code === language) || LANGS[0];

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="topbar">
      {showBack && (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
      )}
      <div className="tb-title">{title}</div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={theme === 'light' ? t('theme.dark') : t('theme.light')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px', borderRadius: 8,
          color: 'var(--muted)', fontSize: 18, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Language switcher */}
      <div ref={langRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setLangOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 8, border: '.5px solid var(--line-2)',
            background: 'var(--bg)', cursor: 'pointer', fontSize: 12,
            fontWeight: 600, color: 'var(--ink)', fontFamily: 'Instrument Sans,sans-serif',
            transition: 'all .15s',
          }}
        >
          <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
          <span>{currentLang.code.toUpperCase()}</span>
          <span style={{ color: 'var(--hint)', fontSize: 10 }}>▾</span>
        </button>

        {langOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            background: 'var(--card)', borderRadius: 10,
            boxShadow: 'var(--sh-md)', border: '.5px solid var(--line)',
            overflow: 'hidden', zIndex: 200, minWidth: 140,
          }}>
            {LANGS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px', border: 'none',
                  background: language === lang.code ? 'var(--bg)' : 'transparent',
                  cursor: 'pointer', fontSize: 13, fontWeight: language === lang.code ? 700 : 400,
                  color: language === lang.code ? 'var(--navy)' : 'var(--ink)',
                  fontFamily: 'Instrument Sans,sans-serif', textAlign: 'left',
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => { if (language !== lang.code) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (language !== lang.code) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {language === lang.code && <span style={{ marginLeft: 'auto', color: 'var(--navy)' }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
