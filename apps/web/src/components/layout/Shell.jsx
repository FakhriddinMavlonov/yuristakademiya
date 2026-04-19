import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell({ role }) {
  return (
    <div className="shell">
      <Sidebar role={role} />
      <div className="main">
        <Topbar />
        <Outlet />
      </div>
    </div>
  );
}
