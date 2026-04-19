import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';

const teacherNav = [
  { to: '/teacher', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/teacher/courses', icon: '📚', label: 'Kurslar' },
  { to: '/teacher/homework', icon: '✅', label: 'Uy ishlari', badge: 'hw' },
  { to: '/teacher/library', icon: '📁', label: 'Kutubxona' },
  { to: '/teacher/meetings', icon: '📅', label: 'Meetinglar' },
  { to: '/teacher/chat', icon: '💬', label: 'Chat', badge: 'msg' },
];

const studentNav = [
  { to: '/student', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/student/courses', icon: '📚', label: 'Kurslar' },
  { to: '/student/meetings', icon: '📹', label: 'Meetinglar' },
  { to: '/student/chat', icon: '💬', label: 'Ustozga savol', badge: 'msg' },
];

const adminNav = [
  { to: '/admin', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/admin/users', icon: '👥', label: 'Foydalanuvchilar' },
  { to: '/admin/messages', icon: '💬', label: 'Telegram Muloqotlari' },
  { to: '/admin/payments', icon: '💳', label: "To'lovlar" },
  { to: '/admin/salaries', icon: '💰', label: 'Oyliklar' },
];

export default function Sidebar({ role }) {
  const { user, logout, unreadMessages } = useStore();
  const navigate = useNavigate();
  const nav = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  const initials = user
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '')
    : '??';

  return (
    <div className="sb">
      <div className="sb-top">
        <div className="sb-mark">YA</div>
        <div>
          <div className="logo-name">Yurist Akademiya</div>
          <div className="logo-sub">LMS Platform v1.0</div>
        </div>
      </div>

      <nav className="sb-nav">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `ni${isActive ? ' active' : ''}`}
          >
            <div className="ni-icon">{item.icon}</div>
            <span className="ni-text">{item.label}</span>
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
          <div className="u-role">
            {user?.role === 'admin' ? 'Admin' : user?.role === 'teacher' ? 'Ustoz' : "O'quvchi"}
          </div>
        </div>
        <button
          onClick={logout}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Chiqish"
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
