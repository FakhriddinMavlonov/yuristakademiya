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
  '/teacher/groups': 'nav.groups',
  '/student': 'nav.dashboard',
  '/student/courses': 'nav.courses',
  '/student/meetings': 'nav.meetings',
  '/student/chat': 'topbar.askTeacher',
  '/student/schedule': 'nav.schedule',
  '/admin': 'topbar.adminPanel',
  '/admin/users': 'nav.users',
  '/admin/messages': 'nav.telegramMessages',
  '/admin/payments': 'nav.payments',
  '/admin/salaries': 'nav.salaries',
  '/admin/groups': 'nav.groups',
};

export default function Topbar({ onMenuToggle }) {
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
      <button className="hamburger" onClick={onMenuToggle} aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
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
        {theme === 'light' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
      </button>

      {/* Language switcher */}
      <div ref={langRef} style={{ position: 'relative' }}>
                <button
          onClick={() => setLangOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 8, border: '.5px solid var(--line-2)',
            background: 'var(--bg)', cursor: 'pointer', fontSize: 12,
            fontWeight: 600, color: 'var(--ink)', fontFamily: 'Instrument Sans,sans-serif',
            transition: 'all .15s',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{currentLang.flag}</span>
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
                {language === lang.code && <span style={{ marginLeft: 'auto', color: 'var(--navy)' }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
