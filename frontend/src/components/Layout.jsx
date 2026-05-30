import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, Compass, Smartphone,
  Lightbulb, Zap, Bookmark, FlaskConical, FileText, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/app',          label: 'Market Explorer', icon: LayoutDashboard, end: true },
  { to: '/app/keywords', label: 'Keywords',         icon: Search },
  { to: '/app/niches',   label: 'Niche Finder',     icon: Compass },
  { to: '/app/market',   label: 'Combined Tool',    icon: FlaskConical, badge: 'New' },
  { to: '/app/analyzer', label: 'App Analyzer',     icon: Smartphone },
  { to: '/app/ideas',    label: 'Idea Generator',   icon: Lightbulb },
  { to: '/app/report',   label: 'Market Report',    icon: FileText, badge: 'New' },
  { to: '/app/reviews',  label: 'Review Intel',     icon: MessageSquare, badge: 'New' },
  { to: '/app/aso',      label: 'ASO Optimizer',    icon: Zap },
  { to: '/app/saved',    label: 'Saved',             icon: Bookmark },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-slate-200 shadow-sm">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="font-bold text-white text-xs leading-none">AN</span>
            </div>
            <span className="font-bold text-slate-800 text-base tracking-tight">AppNiche</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    className={isActive ? 'text-blue-600' : 'text-slate-400'}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">AppNiche v2.0</p>
        </div>

      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}
