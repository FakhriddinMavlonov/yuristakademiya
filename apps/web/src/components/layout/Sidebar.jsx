import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useStore from '../../store/useStore';

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconCheckSquare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const IconVideo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

const IconGroup = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 20 7 20 17 12 22 4 17 4 7 12 2"/>
    <polyline points="12 12 20 7"/>
    <polyline points="12 12 12 22"/>
    <polyline points="12 12 4 7"/>
  </svg>
);

const IconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2m-4-3V5a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v1m4 3a7 7 0 0 0 5 6.95"/>
  </svg>
);

const IconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const ICON_MAP = {
  home: IconHome,
  group: IconGroup,
  clipboard: IconClipboard,
  book: IconBook,
  layers: IconLayers,
  trophy: IconTrophy,
  'bar-chart': IconBarChart,
  users: IconUsers,
  checkSquare: IconCheckSquare,
  folder: IconFolder,
  calendar: IconCalendar,
  message: IconMessage,
  creditCard: IconCreditCard,
  dollar: IconDollar,
  video: IconVideo,
};

const teacherNavKeys = [
  { to: '/teacher', icon: 'home', key: 'nav.dashboard', end: true },
  { to: '/teacher/courses', icon: 'book', key: 'nav.courses' },
  { to: '/teacher/curricula', icon: 'book', key: 'nav.curricula' },
  { to: '/teacher/students', icon: 'users', key: 'nav.myStudents' },
  { to: '/teacher/homework', icon: 'checkSquare', key: 'nav.homework', badge: 'hw' },
  { to: '/teacher/library', icon: 'folder', key: 'nav.library' },
  { to: '/teacher/meetings', icon: 'calendar', key: 'nav.meetings' },
  { to: '/teacher/exams', icon: 'clipboard', key: 'nav.exams' },
  { to: '/teacher/chat', icon: 'message', key: 'nav.chat', badge: 'msg' },
  { to: '/teacher/flashcards', icon: 'layers', key: 'nav.flashcards' },
  { to: '/teacher/analytics', icon: 'bar-chart', key: 'nav.analytics' },
  { to: '/teacher/groups', icon: 'group', key: 'nav.groups' },
];

const studentNavKeys = [
  { to: '/student', icon: 'home', key: 'nav.dashboard', end: true },
  { to: '/student/courses', icon: 'book', key: 'nav.courses' },
  { to: '/student/flashcards', icon: 'layers', key: 'nav.flashcards' },
  { to: '/student/gamification', icon: 'trophy', key: 'nav.gamification' },
  { to: '/student/meetings', icon: 'video', key: 'nav.meetings' },
  { to: '/student/exams', icon: 'clipboard', key: 'nav.exams' },
  { to: '/student/chat', icon: 'message', key: 'nav.askTeacher', badge: 'msg' },
  { to: '/student/schedule', icon: 'calendar', key: 'nav.schedule' },
];

const parentNavKeys = [
  { to: '/parent/dashboard', icon: 'home', key: 'nav.dashboard', end: true },
];

const adminNavKeys = [
  { to: '/admin', icon: 'home', key: 'nav.dashboard', end: true },
  { to: '/admin/users', icon: 'users', key: 'nav.users' },
  { to: '/admin/messages', icon: 'message', key: 'nav.telegramMessages' },
  { to: '/admin/payments', icon: 'creditCard', key: 'nav.payments' },
  { to: '/admin/salaries', icon: 'dollar', key: 'nav.salaries' },
  { to: '/admin/groups', icon: 'group', key: 'nav.groups' },
];

export default function Sidebar({ role, open, onClose }) {
  const { user, logout, unreadMessages, mode, setMode } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const baseNavKeys = role === 'admin' ? adminNavKeys : role === 'teacher' ? teacherNavKeys : role === 'parent' ? parentNavKeys : studentNavKeys;
  const navKeys = role === 'teacher'
    ? baseNavKeys.filter((item) => {
        if (mode === 'online' && item.to === '/teacher/groups') return false;
        if (mode === 'online' && item.to === '/teacher/curricula') return false;
        if (mode === 'offline' && item.to === '/teacher/courses') return false;
        if (mode === 'offline' && item.to === '/teacher/meetings') return false;
        return true;
      })
    : baseNavKeys;

  const initials = user
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '')
    : '??';

  const roleLabel = user?.role === 'admin'
    ? t('sidebar.adminRole')
    : user?.role === 'teacher'
      ? t('sidebar.teacherRole')
      : t('sidebar.studentRole');

  return (
    <div className={`sb${open ? ' sb-open' : ''}`}>
      <div className="sb-top">
        <div className="sb-mark w-">
          <img src="/logo.jpg" alt=""  className=''
          style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: 4 }}/>
        </div>
        <div>
          <div className="logo-name">Yurist Akademiya</div>
          <div className="logo-sub">{t('sidebar.platform')}</div>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 4, padding: 4, margin: '0 16px 12px',
        background: 'rgba(255,255,255,0.08)', borderRadius: 10,
      }}>
        {[['online', '🌐 Online'], ['offline', '🏫 Offline']].map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all .15s',
              background: mode === m ? '#FFD700' : 'transparent',
              color: mode === m ? '#0C1A52' : 'rgba(255,255,255,0.7)',
            }}
          >{label}</button>
        ))}
      </div>

      <nav className="sb-nav">
        {navKeys.map((item) => {
          const IconComponent = ICON_MAP[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `ni${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <div className="ni-icon">{IconComponent && <IconComponent />}</div>
              <span className="ni-text">{t(item.key)}</span>
              {item.badge === 'msg' && unreadMessages > 0 && (
                <span className="ni-badge">{unreadMessages}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sb-user">
        <div className="u-av">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="u-name">{user?.first_name} {user?.last_name}</div>
          <div className="u-role">{roleLabel}</div>
        </div>
        <button
          onClick={logout}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.68)', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={t('common.logout')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
