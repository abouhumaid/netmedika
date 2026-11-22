import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { api } from '../../services/api';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await api.getAllOrders({ status: 'pending', limit: 1 });
      setPendingCount(response.total_orders || 0);
    } catch {
      // Keep the workspace available while the badge is refreshed.
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 45000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60 font-sans lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} pendingCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((value) => !value)} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
          <Outlet context={{ refreshPendingCount: fetchPendingCount }} />
        </main>
        <footer className="bg-white px-6 py-5 text-xs text-slate-500 shadow-[0_-10px_28px_rgba(40,16,23,0.07)] sm:px-8 sm:py-6 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>NetMedika Admin</span><span>Pharmacy operations and patient order management.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
