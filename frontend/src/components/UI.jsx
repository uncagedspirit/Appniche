import clsx from 'clsx';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display text-2xl font-700 text-ink-50">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function ScoreRing({ score, size = 'md', label }) {
  const sizes = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-base', lg: 'w-20 h-20 text-xl' };
  const s = score ?? 0;
  const color = s >= 70 ? 'text-green-400 border-green-400/40' :
                s >= 40 ? 'text-yellow-400 border-yellow-400/40' : 'text-red-400 border-red-400/40';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={clsx('score-ring border-2 font-display font-700', sizes[size], color)}>
        {s}
      </div>
      {label && <span className="text-xs text-ink-500">{label}</span>}
    </div>
  );
}

export function Stars({ score }) {
  const s = parseFloat(score) || 0;
  const filled = Math.round(s);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= filled ? 'text-yellow-400' : 'text-ink-600'} style={{fontSize:'11px'}}>★</span>
      ))}
      <span className="text-xs text-ink-400 ml-1">{s.toFixed(1)}</span>
    </div>
  );
}

export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4 border', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-2' };
  return (
    <div className={clsx('border-acid border-t-transparent rounded-full animate-spin', s[size])} />
  );
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-ink-400">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      {Icon && <Icon size={32} className="text-ink-600" />}
      <div>
        <p className="text-ink-300 font-medium">{title}</p>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
        <span className="text-red-400 text-lg">!</span>
      </div>
      <div>
        <p className="text-ink-300 font-medium">Something went wrong</p>
        <p className="text-sm text-ink-500 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-xs">Try again</button>
      )}
    </div>
  );
}

export function AppCard({ app, onClick, selected }) {
  return (
    <div
      onClick={() => onClick?.(app)}
      className={clsx(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-100',
        selected ? 'border-acid/40 bg-acid/5' : 'border-ink-700 bg-ink-800 hover:border-ink-500 cursor-pointer'
      )}
    >
      <img
        src={app.icon}
        alt={app.title}
        className="w-10 h-10 rounded-xl flex-shrink-0 bg-ink-700"
        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=2a2a27&color=a8a8a2&size=40`; }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-100 truncate">{app.title}</p>
        <p className="text-xs text-ink-500 truncate">{app.developer}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-0.5">
          <span className="text-yellow-400 text-xs">★</span>
          <span className="text-xs text-ink-300">{(app.score || 0).toFixed(1)}</span>
        </div>
        {app.installs && (
          <span className="text-xs text-ink-500">{app.installs}</span>
        )}
      </div>
    </div>
  );
}

export function KeywordBadge({ keyword, score, difficulty, onClick }) {
  const diffColor = !difficulty ? 'border-ink-700 text-ink-300' :
    difficulty < 40 ? 'border-green-500/30 text-green-400 bg-green-500/5' :
    difficulty < 70 ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' :
    'border-red-500/30 text-red-400 bg-red-500/5';

  return (
    <button
      onClick={() => onClick?.(keyword)}
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all hover:brightness-110',
        diffColor
      )}
    >
      <span>{keyword}</span>
      {difficulty !== undefined && (
        <span className="text-xs opacity-60">{difficulty}</span>
      )}
    </button>
  );
}

export function CountrySelect({ value, onChange }) {
  const countries = [
    { code: 'us', name: '🇺🇸 US' },
    { code: 'gb', name: '🇬🇧 UK' },
    { code: 'in', name: '🇮🇳 India' },
    { code: 'de', name: '🇩🇪 Germany' },
    { code: 'fr', name: '🇫🇷 France' },
    { code: 'br', name: '🇧🇷 Brazil' },
    { code: 'ca', name: '🇨🇦 Canada' },
    { code: 'au', name: '🇦🇺 Australia' },
    { code: 'jp', name: '🇯🇵 Japan' },
    { code: 'kr', name: '🇰🇷 Korea' },
    { code: 'mx', name: '🇲🇽 Mexico' },
    { code: 'id', name: '🇮🇩 Indonesia' },
  ];
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="select text-sm w-32">
      {countries.map(c => (
        <option key={c.code} value={c.code}>{c.name}</option>
      ))}
    </select>
  );
}

export function PlatformToggle({ value, onChange }) {
  return (
    <div className="flex bg-ink-800 border border-ink-700 rounded-lg p-0.5">
      {['android', 'ios'].map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={clsx(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            value === p ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'
          )}
        >
          {p === 'android' ? '🤖 Android' : '🍎 iOS'}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card">
      <p className="section-label mb-2">{label}</p>
      <p className={clsx('font-display text-2xl font-700', accent ? 'text-acid' : 'text-ink-50')}>{value}</p>
      {sub && <p className="text-xs text-ink-500 mt-1">{sub}</p>}
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-ink-700 mb-6">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
            active === t.id
              ? 'border-acid text-acid'
              : 'border-transparent text-ink-500 hover:text-ink-300'
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-2 text-xs bg-ink-700 text-ink-400 px-1.5 py-0.5 rounded-full">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="flex gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  );
}
