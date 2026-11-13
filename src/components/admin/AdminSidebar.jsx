import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShieldAlert,
  Sliders,
  History,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export default function AdminSidebar({ isCollapsed, onToggle }) {
  const location = useLocation();
  const { applications, currentUser } = useApp();

  const pendingCount = applications.filter(a => a.status === 'under_review').length;
  const fraudCount = applications.filter(a => a.fraudAlerts && a.fraudAlerts.length > 0).length;

  const navItems = [
    {
      name: 'Underwriting Queue',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      name: 'All Application Dossiers',
      path: '/admin/applications',
      icon: FileSpreadsheet,
      badge: applications.length,
      badgeColor: 'bg-slate-100 text-slate-700'
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-brand-border flex flex-col justify-between transition-all duration-200 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 space-y-6">
        {/* Workspace Brand / Department */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-border">
          {!isCollapsed && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                Credit Underwriting Desk
              </span>
              <h2 className="font-display font-bold text-sm text-brand-ink leading-tight">
                Hero Housing Finance
              </h2>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-brand-ink hover:bg-slate-100 transition-colors mx-auto"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Navigation List (Linear-inspired density) */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-blue-light text-brand-blue font-semibold'
                    : 'text-brand-muted hover:text-brand-ink hover:bg-slate-50'
                }`}
                title={item.name}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {item.badge !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Filter Section */}
        {!isCollapsed && (
          <div className="pt-4 border-t border-brand-border space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3">
              Triage Views
            </span>
            <div className="space-y-1 text-xs">
              <Link
                to="/admin/dashboard?filter=refer"
                className="flex items-center justify-between px-3 py-1.5 rounded text-brand-muted hover:text-brand-ink hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending Underwriter Sign-off</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-amber-800">{pendingCount}</span>
              </Link>

              <Link
                to="/admin/dashboard?filter=anomalies"
                className="flex items-center justify-between px-3 py-1.5 rounded text-brand-muted hover:text-brand-ink hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>Fraud & Income Anomalies</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-red-800">{fraudCount}</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Underwriter Profile Card at bottom */}
      <div className="p-3 border-t border-brand-border bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-brand-blue text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            {currentUser.avatarInitials}
          </div>
          {!isCollapsed && (
            <div className="truncate text-xs">
              <div className="font-semibold text-brand-ink truncate">{currentUser.name}</div>
              <div className="text-[10px] text-brand-muted truncate">Senior Underwriter</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

