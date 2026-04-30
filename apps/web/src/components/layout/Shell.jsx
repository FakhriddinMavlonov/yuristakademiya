import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="shell">
      {sidebarOpen && <div className="sb-overlay" onClick={closeSidebar} />}
      <Sidebar role={role} open={sidebarOpen} onClose={closeSidebar} />
      <div className="main">
        <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <Outlet />
      </div>
    </div>
  );
}
