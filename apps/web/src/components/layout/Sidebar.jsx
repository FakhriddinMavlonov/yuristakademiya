import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useStore from '../../store/useStore';

const teacherNavKeys = [
  { to: '/teacher', icon: '🏠', key: 'nav.dashboard', end: true },
  { to: '/teacher/courses', icon: '📚', key: 'nav.courses' },
  { to: '/teacher/students', icon: '👥', key: 'nav.myStudents' },
  { to: '/teacher/homework', icon: '✅', key: 'nav.homework', badge: 'hw' },
  { to: '/teacher/library', icon: '📁', key: 'nav.library' },
  { to: '/teacher/meetings', icon: '📅', key: 'nav.meetings' },
  { to: '/teacher/chat', icon: '💬', key: 'nav.chat', badge: 'msg' },
];

const studentNavKeys = [
  { to: '/student', icon: '🏠', key: 'nav.dashboard', end: true },
  { to: '/student/courses', icon: '📚', key: 'nav.courses' },
  { to: '/student/meetings', icon: '📹', key: 'nav.meetings' },
  { to: '/student/chat', icon: '💬', key: 'nav.askTeacher', badge: 'msg' },
];

const adminNavKeys = [
  { to: '/admin', icon: '🏠', key: 'nav.dashboard', end: true },
  { to: '/admin/users', icon: '👥', key: 'nav.users' },
  { to: '/admin/messages', icon: '💬', key: 'nav.telegramMessages' },
  { to: '/admin/payments', icon: '💳', key: 'nav.payments' },
  { to: '/admin/salaries', icon: '💰', key: 'nav.salaries' },
];

export default function Sidebar({ role }) {
  const { user, logout, unreadMessages } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navKeys = role === 'admin' ? adminNavKeys : role === 'teacher' ? teacherNavKeys : studentNavKeys;

  const initials = user
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '')
    : '??';

  const roleLabel = user?.role === 'admin'
    ? t('sidebar.adminRole')
    : user?.role === 'teacher'
      ? t('sidebar.teacherRole')
      : t('sidebar.studentRole');

  return (
    <div className="sb">
      <div className="sb-top">
        <div className="sb-mark">YA</div>
        <div>
          <div className="logo-name">Yurist Akademiya</div>
          <div className="logo-sub">{t('sidebar.platform')}</div>
        </div>
      </div>

      <nav className="sb-nav">
        {navKeys.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `ni${isActive ? ' active' : ''}`}
          >
            <div className="ni-icon">{item.icon}</div>
            <span className="ni-text">{t(item.key)}</span>
            {item.badge === 'msg' && unreadMessages > 0 && (
              <span className="ni-badge">{unreadMessages}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sb-user">
        <div className="u-av">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="u-name">{user?.first_name} {user?.last_name}</div>
          <div className="u-role">{roleLabel}</div>
        </div>
        <button
          onClick={logout}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
