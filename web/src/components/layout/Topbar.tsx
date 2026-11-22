import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Search, UserRound, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface TopbarProps {
  onToggleSidebar: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar, onRefresh, isRefreshing = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const response = await api.getNotifications(1);
      setUnreadNotifications(response.unread_count || 0);
    } catch {
      // The header remains usable if notification counts are unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshUnreadNotifications();
    const interval = window.setInterval(refreshUnreadNotifications, 30000);
    window.addEventListener('focus', refreshUnreadNotifications);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshUnreadNotifications);
    };
  }, [refreshUnreadNotifications, location.pathname]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[100px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md sm:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <button type="button" onClick={onToggleSidebar} aria-label="Toggle navigation" className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"><Menu className="h-5 w-5"/></button>
        <label className="flex w-full min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-400 focus-within:border-teal-500 focus-within:bg-white sm:gap-2.5 sm:px-3.5">
          <Search className="h-4 w-4 shrink-0" />
          <input aria-label="Search dashboard" placeholder="Search..." className="w-full min-w-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:text-sm sm:placeholder:text-transparent md:placeholder:text-slate-400" />
          <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 md:inline">⌘ K</kbd>
        </label>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button type="button" onClick={() => navigate('/notifications')} aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'} title="Notifications" className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
        </button>
        {onRefresh && <button type="button" onClick={onRefresh} disabled={isRefreshing} title="Refresh current data" className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`}/></button>}
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Open administrator menu" className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-sm font-bold text-teal-800">{user?.profile_picture ? <img src={user.profile_picture} alt={user.username} className="h-full w-full object-cover"/> : (user?.username?.[0] || 'A').toUpperCase()}</span>
            <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
          </button>
          {menuOpen && <div role="menu" className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
            <div className="border-b border-slate-100 px-3.5 py-2.5"><p className="truncate text-sm font-semibold text-slate-800">{user?.username || 'Admin'}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div>
            <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><UserRound className="h-4 w-4 text-slate-400"/>Profile</button>
            <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); navigate('/change-password'); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><KeyRound className="h-4 w-4 text-slate-400"/>Change password</button>
            <button role="menuitem" type="button" onClick={async () => { setMenuOpen(false); await logout(); navigate('/login', { replace: true }); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4"/>Log out</button>
          </div>}
        </div>
      </div>
    </header>
  );
};
