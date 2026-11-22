import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Pill,
  ChevronRight,
  Boxes,
  BarChart3,
  Truck,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  pendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile, pendingCount = 0 }) => {
  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Orders & Prescriptions',
      path: '/orders',
      icon: ClipboardList,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-sm lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 flex items-center gap-3 border-b border-slate-100 py-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pharmacy-700 to-pharmacy-500 flex items-center justify-center text-white shadow-md shadow-pharmacy-600/30">
            <Pill className="w-5 h-5 transform rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">NetMedika</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Pharmacy Operations</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Main Management
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-pharmacy-50 text-pharmacy-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive
                          ? 'text-pharmacy-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge !== null && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-amber-700 bg-amber-100 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {isActive && item.badge === null && (
                    <ChevronRight className="w-4 h-4 text-pharmacy-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          <div className="mt-8 border-t border-slate-100 pt-5">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Suggested features
            </div>
            {[
              { name: 'Inventory', icon: Boxes },
              { name: 'Reports', icon: BarChart3 },
              { name: 'Suppliers', icon: Truck },
            ].map(({ name, icon: Icon }) => (
              <a
                key={name}
                href="#"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="flex cursor-default items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400"
                title={`${name} is a suggested feature and is not available yet`}
              >
                <span className="flex items-center gap-3"><Icon className="h-5 w-5" />{name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Soon</span>
              </a>
            ))}
          </div>
        </div>

      </aside>
    </>
  );
};
