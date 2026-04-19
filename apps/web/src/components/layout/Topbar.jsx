import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const titles = {
  '/teacher': 'Dashboard',
  '/teacher/courses': 'Kurslar',
  '/teacher/homework': 'Uy ishlari tekshirish',
  '/teacher/library': 'Kutubxona',
  '/teacher/meetings': 'Meetinglar',
  '/teacher/chat': 'Chat',
  '/student': 'Dashboard',
  '/student/courses': 'Kurslar',
  '/student/meetings': 'Meetinglar',
  '/student/chat': 'Ustozga savol',
  '/admin': 'Admin Panel',
  '/admin/users': 'Foydalanuvchilar',
  '/admin/messages': 'Telegram Muloqotlari',
  '/admin/payments': "To'lovlar",
  '/admin/salaries': 'Oyliklar',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const title = Object.entries(titles)
    .reverse()
    .find(([k]) => pathname.startsWith(k))?.[1] || 'Yurist Akademiya';

  const showBack = pathname.split('/').length > 3;

  return (
    <div className="topbar">
      {showBack && (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          ← Orqaga
        </button>
      )}
      <div className="tb-title">{title}</div>
    </div>
  );
}
