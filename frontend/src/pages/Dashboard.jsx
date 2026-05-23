import { useState, useCallback } from 'react';
import { nichesAPI } from '../lib/api.js';
import {
  Search, SlidersHorizontal, ChevronUp, ChevronDown,
  X, TrendingUp, Download, Star, Calendar, RefreshCw,
  DollarSign, Package, Zap
} from 'lucide-react';

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null || n === 0) return '—';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtRevenue(n) {
  if (n == null || n === 0) return '—';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n;
}

function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return str; }
}

function ageDays(days) {
  if (days == null) return '—';
  if (days < 30)  return days + 'd';
  if (days < 365) return Math.round(days / 30) + 'mo';
  return (days / 365).toFixed(1) + 'yr';
}

// ── Filter config ─────────────────────────────────────────────────────────────
const FILTER_DEFAULTS = {
  minRating: 0,
  minInstalls: 0,
  priceType: 'all',
  updateRange: 'any',
  releaseRange: 'any',
  hasIAP: false,
  hasAds: false,
  editorsChoice: false,
  hasVideo: false,
  minScreenshots: 0,
  contentRating: 'all',
};

const RELEASE_OPTS = [
  { v: 'any', l: 'Any time' },
  { v: '7',   l: 'Last week' },
  { v: '30',  l: 'Last 30 days' },
  { v: '90',  l: 'Last 90 days' },
  { v: '365', l: 'Last year' },
  { v: '365+',l: '1 yr+ ago' },
];

const UPDATE_OPTS = [
  { v: 'any',  l: 'Any time' },
  { v: '30',   l: 'Last 30 days' },
  { v: '90',   l: 'Last 90 days' },
  { v: '180',  l: 'Last 6 months' },
  { v: '365',  l: 'Last year' },
  { v: '365+', l: '1 yr+ old' },
];

const INSTALL_OPTS = [
  { v: 0,          l: 'Any' },
  { v: 1_000,      l: '1K+' },
  { v: 10_000,     l: '10K+' },
  { v: 100_000,    l: '100K+' },
  { v: 1_000_000,  l: '1M+' },
  { v: 10_000_000, l: '10M+' },
];

const CONTENT_OPTS = [
  { v: 'all',       l: 'All ratings' },
  { v: 'Everyone',  l: 'Everyone' },
  { v: 'Teen',      l: 'Teen' },
  { v: 'Mature 17+',l: 'Mature 17+' },
];

// ── Filter / sort logic ───────────────────────────────────────────────────────
function applyFilters(apps, f) {
  return apps.filter(a => {
    if (f.minRating   > 0    && (a.score       || 0) < f.minRating)   return false;
    if (f.minInstalls > 0    && (a.minInstalls  || 0) < f.minInstalls) return false;
    if (f.priceType === 'free' && a.free === false) return false;
    if (f.priceType === 'paid' && a.free !== false) return false;
    if (f.updateRange !== 'any') {
      if (a.daysSinceUpdate == null) return false;
      if (f.updateRange === '365+') { if (a.daysSinceUpdate <= 365) return false; }
      else if (a.daysSinceUpdate > parseInt(f.updateRange)) return false;
    }
    if (f.releaseRange !== 'any') {
      if (a.daysSinceRelease == null) return false;
      if (f.releaseRange === '365+') { if (a.daysSinceRelease <= 365) return false; }
      else if (a.daysSinceRelease > parseInt(f.releaseRange)) return false;
    }
    if (f.hasIAP        && !a.offersIAP)     return false;
    if (f.hasAds        && !a.adSupported)   return false;
    if (f.editorsChoice && !a.editorsChoice) return false;
    if (f.hasVideo      && !a.hasVideo)      return false;
    if (f.minScreenshots > 0 && (a.screenshotCount || 0) < f.minScreenshots) return false;
    if (f.contentRating !== 'all' && a.contentRating !== f.contentRating) return false;
    return true;
  });
}

function applySort(apps, { key, dir }) {
  const sorted = [...apps];
  sorted.sort((a, b) => {
    let va, vb;
    switch (key) {
      case 'title':           va = (a.title||'').toLowerCase();  vb = (b.title||'').toLowerCase();  break;
      case 'score':           va = a.score           || 0;  vb = b.score           || 0;  break;
      case 'minInstalls':     va = a.minInstalls      || 0;  vb = b.minInstalls      || 0;  break;
      case 'dailyInstalls':   va = a.dailyInstalls    || 0;  vb = b.dailyInstalls    || 0;  break;
      case 'monthlyInstalls': va = a.monthlyInstalls  || 0;  vb = b.monthlyInstalls  || 0;  break;
      case 'revenueEstimate': va = a.revenueEstimate  || 0;  vb = b.revenueEstimate  || 0;  break;
      case 'released':        va = a.daysSinceRelease ?? 99999; vb = b.daysSinceRelease ?? 99999; break;
      case 'updated':         va = a.daysSinceUpdate  ?? 99999; vb = b.daysSinceUpdate  ?? 99999; break;
      case 'asoScore':        va = a.asoScore         || 0;  vb = b.asoScore         || 0;  break;
      case 'price':           va = a.price            || 0;  vb = b.price            || 0;  break;
      default: return 0;
    }
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return dir === 'asc' ? va - vb : vb - va;
  });
  return sorted;
}

function countActive(f) {
  return Object.entries(f).filter(([k, v]) => v !== FILTER_DEFAULTS[k]).length;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ASOBadge({ score }) {
  const s = score ?? 0;
  const cls = s >= 70 ? 'bg-green-50 text-green-700 ring-green-200'
            : s >= 40 ? 'bg-amber-50 text-amber-700 ring-amber-200'
            :           'bg-red-50   text-red-700   ring-red-200';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ring-1 ${cls}`}>
      {s}
    </span>
  );
}

function UpdateAge({ days }) {
  if (days == null) return <span className="text-slate-400 text-xs">—</span>;
  const cls = days <= 30  ? 'text-green-600'
            : days <= 90  ? 'text-emerald-600'
            : days <= 365 ? 'text-amber-600'
            :               'text-red-600';
  return <span className={`text-xs font-medium ${cls}`}>{ageDays(days)}</span>;
}

function SortTh({ label, sortKey, current, onSort, children }) {
  const active = current.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-colors
        ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
    >
      <span className="flex items-center gap-1">
        {label || children}
        {active
          ? current.dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
          : <span className="opacity-0 w-3 h-3" />}
      </span>
    </th>
  );
}

// ── Stats bar data ────────────────────────────────────────────────────────────
function computeStats(apps) {
  const total   = apps.length;
  const active  = apps.filter(a => a.daysSinceUpdate != null && a.daysSinceUpdate <= 365).length;
  const stale   = apps.filter(a => a.daysSinceUpdate != null && a.daysSinceUpdate  > 365).length;
  const scored  = apps.filter(a => a.score > 0);
  const avgRating = scored.length
    ? (scored.reduce((s, a) => s + a.score, 0) / scored.length).toFixed(1)
    : '—';
  const freeCount = apps.filter(a => a.free !== false).length;
  const iapCount  = apps.filter(a => a.offersIAP).length;
  const totalRev  = apps.reduce((s, a) => s + (a.revenueEstimate || 0), 0);
  return { total, active, stale, avgRating, freeCount, iapCount, totalRev };
}

// ── Main component ────────────────────────────────────────────────────────────
const COUNTRIES = [
  ['us','🇺🇸 US'],['gb','🇬🇧 UK'],['in','🇮🇳 IN'],
  ['de','🇩🇪 DE'],['fr','🇫🇷 FR'],['br','🇧🇷 BR'],
  ['ca','🇨🇦 CA'],['au','🇦🇺 AU'],['jp','🇯🇵 JP'],
  ['kr','🇰🇷 KR'],['mx','🇲🇽 MX'],['id','🇮🇩 ID'],
];

const SUGGESTIONS = ['meditation', 'fitness tracker', 'budget planner', 'photo editor', 'language learning', 'habit tracker', 'sleep sounds', 'recipe app'];

export default function Dashboard() {
  const [query,       setQuery]       = useState('');
  const [country,     setCountry]     = useState('us');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [result,      setResult]      = useState(null);
  const [filters,     setFilters]     = useState(FILTER_DEFAULTS);
  const [showFilters, setShowFilters] = useState(false);
  const [sort,        setSort]        = useState({ key: 'minInstalls', dir: 'desc' });

  const doSearch = useCallback(async (q = query, c = country) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await nichesAPI.search(q.trim(), c);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query, country]);

  const handleKey  = e => { if (e.key === 'Enter') doSearch(); };
  const handleSort = key => setSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });
  const setFilter  = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const activeCount = countActive(filters);

  const displayedApps = result
    ? applySort(applyFilters(result.apps, filters), sort)
    : [];
  const stats = result ? computeStats(result.apps) : null;

  // ── Hero screen (no results yet) ──────────────────────────────────────────
  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
        <div className="w-full max-w-2xl text-center">
          {/* Logo mark */}
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Market Explorer</h1>
          <p className="text-slate-500 text-lg mb-10">
            Search any keyword to analyse every app competing in that niche
          </p>

          {/* Search bar */}
          <div className="flex gap-2 shadow-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. meditation, fitness tracker, budget planner…"
                className="w-full pl-11 pr-4 py-3.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white text-slate-900 placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white text-slate-700"
            >
              {COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
            <button
              onClick={() => doSearch()}
              className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Search
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          {/* Quick suggestions */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); doSearch(s); }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Feature hints */}
          <div className="mt-14 grid grid-cols-3 gap-4 text-left">
            {[
              { icon: Package, title: '100 apps per search', desc: 'See the full competitive landscape, not just the top 5.' },
              { icon: SlidersHorizontal, title: '10+ smart filters', desc: 'Filter by installs, rating, IAP, ads, update age and more.' },
              { icon: Zap, title: 'ASO quality scores', desc: 'Spot weak competitors with low ASO to enter the niche.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Icon size={16} className="text-blue-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Analysing market for <strong className="text-slate-700">"{query}"</strong>…</p>
        <p className="text-xs text-slate-400">Fetching up to 100 apps + full detail enrichment</p>
      </div>
    );
  }

  // ── Results view ──────────────────────────────────────────────────────────
  const m = result?.metrics;

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">

      {/* ── Top search bar ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-2 sticky top-0 z-20 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search keyword or niche…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-400"
        >
          {COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
        </select>
        <button
          onClick={() => doSearch()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Search
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            showFilters || activeCount > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => setFilters(FILTER_DEFAULTS)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      {stats && (
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <Stat label="Total apps"  value={stats.total}    />
          <Sep />
          <StatDot color="bg-green-500" label="Active (≤1yr)"  value={stats.active} />
          <StatDot color="bg-red-400"   label="Stale (1yr+)"   value={stats.stale}  />
          <Sep />
          <Stat label="Avg rating"  value={<span className="text-amber-600 font-bold">★ {stats.avgRating}</span>} />
          <Stat label="Free"        value={stats.freeCount} />
          <Stat label="With IAP"    value={stats.iapCount}  />
          <Stat label="Est. total rev." value={<span className="text-emerald-700 font-semibold">{fmtRevenue(stats.totalRev)}/mo</span>} />
          {m && (
            <>
              <Sep />
              <ScorePill label="Opportunity" score={m.opportunityScore}
                color={m.opportunityScore >= 65 ? 'bg-green-100 text-green-700' : m.opportunityScore >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}
              />
              <ScorePill label="Demand"      score={m.demandScore}      color="bg-blue-100 text-blue-700" />
              <ScorePill label="Competition" score={m.competitionScore} color="bg-slate-100 text-slate-700" />
            </>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {displayedApps.length} / {result.apps.length} apps
          </span>
        </div>
      )}

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="bg-white border-b border-slate-200 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <FilterSelect label="Release date"  value={filters.releaseRange}  onChange={v => setFilter('releaseRange', v)}  opts={RELEASE_OPTS} />
            <FilterSelect label="Last updated"  value={filters.updateRange}   onChange={v => setFilter('updateRange', v)}   opts={UPDATE_OPTS} />
            <FilterSelect label="Min rating"    value={filters.minRating}     onChange={v => setFilter('minRating', parseFloat(v))}
              opts={[{v:0,l:'Any'},{v:3,l:'3★+'},{v:3.5,l:'3.5★+'},{v:4,l:'4★+'},{v:4.5,l:'4.5★+'}]} />
            <FilterSelect label="Min installs"  value={filters.minInstalls}   onChange={v => setFilter('minInstalls', parseInt(v))}  opts={INSTALL_OPTS} />
            <FilterSelect label="Price"         value={filters.priceType}     onChange={v => setFilter('priceType', v)}
              opts={[{v:'all',l:'All'},{v:'free',l:'Free only'},{v:'paid',l:'Paid only'}]} />
            <FilterSelect label="Content rating" value={filters.contentRating} onChange={v => setFilter('contentRating', v)} opts={CONTENT_OPTS} />
          </div>

          {/* Checkbox row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {[
              { k: 'hasIAP',        l: 'Has IAP' },
              { k: 'hasAds',        l: 'Has Ads' },
              { k: 'hasVideo',      l: 'Has Promo Video' },
              { k: 'editorsChoice', l: "Editor's Choice" },
            ].map(({ k, l }) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={filters[k]}
                  onChange={e => setFilter(k, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                {l}
              </label>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Min screenshots</span>
              <select
                value={filters.minScreenshots}
                onChange={e => setFilter('minScreenshots', parseInt(e.target.value))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400"
              >
                {[0,1,3,5,8].map(v => <option key={v} value={v}>{v === 0 ? 'Any' : `${v}+`}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="pl-5 pr-2 py-3 text-left text-xs font-semibold text-slate-400 w-9">#</th>
              <SortTh label="App"            sortKey="title"           current={sort} onSort={handleSort} />
              <SortTh label="Rating"         sortKey="score"           current={sort} onSort={handleSort} />
              <SortTh label="Google Installs" sortKey="minInstalls"    current={sort} onSort={handleSort} />
              <SortTh label="Daily Est."     sortKey="dailyInstalls"   current={sort} onSort={handleSort} />
              <SortTh label="Monthly Est."   sortKey="monthlyInstalls" current={sort} onSort={handleSort} />
              <SortTh label="Revenue/mo"     sortKey="revenueEstimate" current={sort} onSort={handleSort} />
              <SortTh label="Released"       sortKey="released"        current={sort} onSort={handleSort} />
              <SortTh label="Updated"        sortKey="updated"         current={sort} onSort={handleSort} />
              <SortTh label="ASO"            sortKey="asoScore"        current={sort} onSort={handleSort} />
              <SortTh label="Price"          sortKey="price"           current={sort} onSort={handleSort} />
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Flags</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {displayedApps.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-20 text-center text-slate-400">
                  No apps match your current filters.{' '}
                  <button onClick={() => setFilters(FILTER_DEFAULTS)} className="text-blue-600 hover:underline">Clear filters</button>
                </td>
              </tr>
            ) : displayedApps.map((app, i) => (
              <tr key={app.appId} className="hover:bg-blue-50/30 transition-colors">
                {/* # */}
                <td className="pl-5 pr-2 py-3 text-xs text-slate-400 font-medium">{i + 1}</td>

                {/* App */}
                <td className="px-3 py-3" style={{ minWidth: '220px', maxWidth: '260px' }}>
                  <div className="flex items-center gap-3">
                    <img
                      src={app.icon}
                      alt={app.title}
                      className="w-9 h-9 rounded-xl flex-shrink-0 bg-slate-100 object-cover"
                      onError={e => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=36`;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate text-sm leading-tight">{app.title}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{app.developer}</p>
                    </div>
                  </div>
                </td>

                {/* Rating */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {app.score > 0 ? (
                    <span className="flex items-center gap-1">
                      <Star size={11} className="text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-slate-700">{app.score.toFixed(1)}</span>
                      {app.reviews > 0 && <span className="text-xs text-slate-400">({fmtNum(app.reviews)})</span>}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>

                {/* Google Installs */}
                <td className="px-3 py-3">
                  <span className="font-medium text-slate-700">{fmtNum(app.minInstalls)}</span>
                </td>

                {/* Daily Est. */}
                <td className="px-3 py-3">
                  <span className="font-medium text-slate-700">{fmtNum(app.dailyInstalls)}</span>
                </td>

                {/* Monthly Est. */}
                <td className="px-3 py-3">
                  <span className="font-medium text-slate-700">{fmtNum(app.monthlyInstalls)}</span>
                </td>

                {/* Revenue/mo */}
                <td className="px-3 py-3">
                  {app.revenueEstimate
                    ? <span className="font-semibold text-emerald-700">{fmtRevenue(app.revenueEstimate)}</span>
                    : <span className="text-slate-400">—</span>}
                </td>

                {/* Released */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                    {fmtDate(app.released)}
                  </span>
                </td>

                {/* Updated */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={11} className="text-slate-400 flex-shrink-0" />
                    <UpdateAge days={app.daysSinceUpdate} />
                  </span>
                </td>

                {/* ASO */}
                <td className="px-3 py-3"><ASOBadge score={app.asoScore} /></td>

                {/* Price */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {app.free !== false
                    ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200">Free</span>
                    : <span className="text-xs font-semibold text-slate-700 flex items-center gap-0.5"><DollarSign size={10}/>{(app.price||0).toFixed(2)}</span>}
                </td>

                {/* Flags */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {app.offersIAP     && <Flag label="IAP" />}
                    {app.adSupported   && <Flag label="Ads" />}
                    {app.hasVideo      && <Flag label="Vid" blue />}
                    {app.editorsChoice && <Flag label="EC"  blue />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Sep() {
  return <div className="h-4 w-px bg-slate-200" />;
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function StatDot({ color, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function ScorePill({ label, score, color }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}: {score}
    </span>
  );
}

function FilterSelect({ label, value, onChange, opts }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
      >
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Flag({ label, blue }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${
      blue ? 'bg-blue-50 text-blue-600 ring-blue-200' : 'bg-slate-100 text-slate-500 ring-slate-200'
    }`}>
      {label}
    </span>
  );
}
