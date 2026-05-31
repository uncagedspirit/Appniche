import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, Compass, Smartphone,
  Lightbulb, Zap, Bookmark, FlaskConical, FileText,
  MessageSquare, Eye, CheckSquare, BarChart2,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_SECTIONS = [
  {
    label: 'Research',
    items: [
      { to: '/app',          label: 'Market Explorer', icon: LayoutDashboard, end: true },
      { to: '/app/keywords', label: 'Keywords',         icon: Search },
      { to: '/app/niches',   label: 'Niche Finder',     icon: Compass },
      { to: '/app/market',   label: 'Combined Tool',    icon: FlaskConical },
      { to: '/app/analyzer', label: 'App Analyzer',     icon: Smartphone },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/app/ideas',    label: 'Idea Generator',   icon: Lightbulb },
      { to: '/app/validate', label: 'Idea Validator',   icon: CheckSquare },
      { to: '/app/report',   label: 'Market Report',    icon: FileText },
      { to: '/app/reviews',  label: 'Review Intel',     icon: MessageSquare },
      { to: '/app/aso',      label: 'ASO Optimizer',    icon: Zap },
    ],
  },
  {
    label: 'Saved',
    items: [
      { to: '/app/watchlist', label: 'Watchlist',       icon: Eye },
      { to: '/app/saved',     label: 'Saved Items',     icon: Bookmark },
    ],
  },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-slate-100">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
              <BarChart2 size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-800 text-[15px] tracking-tight">AppNiche</span>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-4">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">{label}</p>
              <div className="space-y-0.5">
                {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={14}
                          className={isActive ? 'text-blue-600' : 'text-slate-400'}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className="flex-1 leading-none">{itemLabel}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">AppNiche v2.0</p>
        </div>

      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}
