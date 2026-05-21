import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, Compass, Smartphone,
  Lightbulb, Zap, Bookmark, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/keywords', label: 'Keywords', icon: Search },
  { to: '/app/niches', label: 'Niches', icon: Compass },
  { to: '/app/analyzer', label: 'App Analyzer', icon: Smartphone },
  { to: '/app/ideas', label: 'Idea Generator', icon: Lightbulb },
  { to: '/app/aso', label: 'ASO Optimizer', icon: Zap },
  { to: '/app/saved', label: 'Saved', icon: Bookmark },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-ink-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-ink-800 bg-ink-900">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-acid rounded-lg flex items-center justify-center">
              <span className="font-display font-800 text-ink-900 text-xs">AN</span>
            </div>
            <span className="font-display font-700 text-ink-50 text-base">AppNiche</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100 group',
                isActive
                  ? 'bg-acid/15 text-acid'
                  : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className={isActive ? 'text-acid' : 'text-ink-500 group-hover:text-ink-300'} />
                  {label}
                  {isActive && <ChevronRight size={12} className="ml-auto text-acid/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
