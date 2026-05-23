import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nichesAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import {
  PageHeader, CountrySelect, LoadingState, ErrorState,
  ScoreRing, TabBar, AppCard, EmptyState,
} from '../components/UI.jsx';
import {
  TrendingUp, Search, Zap, SlidersHorizontal, X,
  Video, ShoppingCart, Megaphone, Award, Trash2, RefreshCw, Table2, LayoutGrid,
} from 'lucide-react';
import clsx from 'clsx';

// ── small display components ──────────────────────────────────────────────────

function MetricBar({ label, value, invert = false }) {
  const good = invert ? value < 45 : value >= 70;
  const mid  = invert ? value < 70 : value >= 45;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-ink-500">{label}</span>
        <span className={clsx('text-xs font-mono font-bold',
          good ? 'text-green-400' : mid ? 'text-yellow-400' : 'text-red-400'
        )}>{value}</span>
      </div>
      <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-700',
          good ? 'bg-green-400' : mid ? 'bg-yellow-400' : 'bg-red-400'
        )} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ASOBadge({ score }) {
  const s = score ?? 0;
  return (
    <span className={clsx('text-xs px-1.5 py-0.5 rounded border font-mono font-bold',
      s >= 70 ? 'text-green-400 bg-green-400/10 border-green-400/20' :
      s >= 45 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                'text-red-400 bg-red-400/10 border-red-400/20'
    )}>{s}</span>
  );
}

function AgeBadge({ days, label = true }) {
  if (days === null || days === undefined) return <span className="text-xs text-ink-600">—</span>;
  const color = days <= 30  ? 'text-green-400'  :
                days <= 90  ? 'text-yellow-400' :
                days <= 365 ? 'text-orange-400' : 'text-red-400';
  const text  = days === 0  ? 'Today' :
                days <  31  ? `${days}d` :
                days <  366 ? `${Math.round(days / 30)}mo` :
                              `${Math.round(days / 365)}yr`;
  return <span className={clsx('text-xs font-mono', color)}>{text}{label ? ' ago' : ''}</span>;
}

function Revenue({ value }) {
  if (!value) return <span className="text-xs text-ink-600">—</span>;
  const fmt = value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M`
            : value >= 1_000     ? `$${(value / 1_000).toFixed(0)}K`
            : `$${value}`;
  return <span className="text-xs text-ink-300 font-mono">{fmt}/mo</span>;
}

function FeatureIcons({ app, size = 11 }) {
  return (
    <div className="flex items-center gap-1.5">
      {app.hasVideo      && <Video        size={size} className="text-blue-400"   title="Promo video" />}
      {app.offersIAP     && <ShoppingCart size={size} className="text-purple-400" title="In-app purchases" />}
      {app.adSupported   && <Megaphone    size={size} className="text-orange-400" title="Ad supported" />}
      {app.editorsChoice && <Award        size={size} className="text-yellow-400" title="Editor's choice" />}
    </div>
  );
}

// ── filter / sort helpers ─────────────────────────────────────────────────────

const INSTALL_OPTS = [
  { label: 'Any installs',  value: 0 },
  { label: '1,000+',        value: 1_000 },
  { label: '10,000+',       value: 10_000 },
  { label: '100,000+',      value: 100_000 },
  { label: '1,000,000+',    value: 1_000_000 },
  { label: '10,000,000+',   value: 10_000_000 },
];

const UPDATE_OPTS = [
  { label: 'Any time',              value: 'any' },
  { label: 'Last 30 days',          value: 'fresh' },
  { label: '31 – 90 days',          value: 'active' },
  { label: '91 – 365 days (aging)', value: 'aging' },
  { label: '1+ year (abandoned)',   value: 'dead' },
];

const AGE_OPTS = [
  { label: 'Any age',          value: 'any' },
  { label: 'New (< 6 months)', value: 'new' },
  { label: '6 months – 2 yrs', value: 'young' },
  { label: '2+ years',         value: 'mature' },
];

const SCREENSHOT_OPTS = [
  { label: 'Any',  value: 0 },
  { label: '3+',   value: 3 },
  { label: '5+',   value: 5 },
  { label: '8+',   value: 8 },
];

const SORT_OPTS = [
  { label: 'Default order',             value: 'default' },
  { label: 'Rating — high to low',      value: 'rating_desc' },
  { label: 'Rating — low to high',      value: 'rating_asc' },
  { label: 'Most installs',             value: 'installs_desc' },
  { label: 'Fewest installs',           value: 'installs_asc' },
  { label: 'ASO Score — best',          value: 'aso_desc' },
  { label: 'ASO Score — worst',         value: 'aso_asc' },
  { label: 'Most recently updated',     value: 'updated_asc' },
  { label: 'Least recently updated',    value: 'updated_desc' },
  { label: 'Newest apps first',         value: 'age_asc' },
  { label: 'Oldest apps first',         value: 'age_desc' },
  { label: 'Revenue est. — high',       value: 'revenue_desc' },
];

const DEFAULT_FILTERS = {
  minRating:      0,
  minInstalls:    0,
  priceType:      'all',   // 'all' | 'free' | 'paid'
  updateRange:    'any',
  ageRange:       'any',
  hasVideo:       false,
  hasIAP:         false,
  adFree:         false,
  editorsChoice:  false,
  minScreenshots: 0,
};

function applyFilters(apps, f) {
  if (!apps) return [];
  return apps.filter(app => {
    if (f.minRating > 0 && app.score < f.minRating) return false;
    if (f.minInstalls > 0 && app.minInstalls < f.minInstalls) return false;
    if (f.priceType === 'free' && !app.free) return false;
    if (f.priceType === 'paid' && app.free) return false;

    const dsu = app.daysSinceUpdate;
    if (f.updateRange === 'fresh'  && !(dsu !== null && dsu <= 30))              return false;
    if (f.updateRange === 'active' && !(dsu !== null && dsu > 30 && dsu <= 90))  return false;
    if (f.updateRange === 'aging'  && !(dsu !== null && dsu > 90 && dsu <= 365)) return false;
    if (f.updateRange === 'dead'   && !(dsu !== null && dsu > 365))              return false;

    const dsr = app.daysSinceRelease;
    if (f.ageRange === 'new'    && !(dsr !== null && dsr <= 180))              return false;
    if (f.ageRange === 'young'  && !(dsr !== null && dsr > 180 && dsr <= 730)) return false;
    if (f.ageRange === 'mature' && !(dsr !== null && dsr > 730))               return false;

    if (f.hasVideo       && !app.hasVideo)      return false;
    if (f.hasIAP         && !app.offersIAP)     return false;
    if (f.adFree         && app.adSupported)    return false;
    if (f.editorsChoice  && !app.editorsChoice) return false;
    if (f.minScreenshots > 0 && app.screenshotCount < f.minScreenshots) return false;
    return true;
  });
}

function applySort(apps, key) {
  if (!key || key === 'default') return apps;
  const [field, dir] = key.split('_');
  const asc = dir === 'asc';
  return [...apps].sort((a, b) => {
    let av, bv;
    switch (field) {
      case 'rating':   av = a.score || 0;                       bv = b.score || 0;                       break;
      case 'installs': av = a.minInstalls || 0;                 bv = b.minInstalls || 0;                 break;
      case 'aso':      av = a.asoScore || 0;                    bv = b.asoScore || 0;                    break;
      case 'updated':  av = a.daysSinceUpdate  ?? 9999;         bv = b.daysSinceUpdate  ?? 9999;         break;
      case 'age':      av = a.daysSinceRelease ?? 9999;         bv = b.daysSinceRelease ?? 9999;         break;
      case 'revenue':  av = a.revenueEstimate || 0;             bv = b.revenueEstimate || 0;             break;
      default: return 0;
    }
    return asc ? av - bv : bv - av;
  });
}

function countActiveFilters(f) {
  return Object.entries(f).filter(([, v]) =>
    typeof v === 'boolean' ? v : (v !== 0 && v !== 'all' && v !== 'any')
  ).length;
}

// ── keyword title filter ──────────────────────────────────────────────────────

function applyKeywordFilter(apps, query) {
  if (!query) return apps;
  const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return apps;
  return apps.filter(app => {
    const title = (app.title || '').toLowerCase();
    return words.every(w => title.includes(w));
  });
}

// ── main component ────────────────────────────────────────────────────────────

export default function NicheExplorer() {
  const [searchParams] = useSearchParams();
  const { country, setCountry } = useSettings();
  const [mode, setMode] = useState('finder');
  const apiCountry = country === 'all' ? 'us' : country;

  // Finder
  const [query,          setQuery]          = useState('');
  const [searchResult,   setSearchResult]   = useState(null);
  const [allApps,        setAllApps]        = useState([]);
  const [loadingSearch,  setLoadingSearch]  = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchProgress,  setBatchProgress]  = useState(0);
  const [searchError,    setSearchError]    = useState(null);
  const [filters,        setFilters]        = useState(DEFAULT_FILTERS);
  const [sortKey,        setSortKey]        = useState('default');
  const [showFilters,    setShowFilters]    = useState(false);
  const [viewMode,       setViewMode]       = useState('table');
  const searchIdRef = useRef(0);

  // Browse (unchanged)
  const [categories,   setCategories]   = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [nicheData,    setNicheData]    = useState(null);
  const [loadingOpp,   setLoadingOpp]   = useState(true);
  const [loadingNiche, setLoadingNiche] = useState(false);
  const [browseError,  setBrowseError]  = useState(null);
  const [browseTab,    setBrowseTab]    = useState('top_free');

  // Removed apps
  const [removedInput,   setRemovedInput]   = useState('');
  const [removedResults, setRemovedResults] = useState(null);
  const [loadingRemoved, setLoadingRemoved] = useState(false);
  const [removedError,   setRemovedError]   = useState(null);

  useEffect(() => {
    nichesAPI.categories().then(setCategories).catch(() => {});
    loadOpportunities();
    const cat = searchParams.get('cat');
    if (cat) { setMode('browse'); handleSelectCategory(cat); }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run search when country changes if there's an active search
  useEffect(() => {
    if (query.trim() && searchResult) handleSearch();
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOpportunities = async () => {
    setLoadingOpp(true);
    try { const d = await nichesAPI.opportunities(apiCountry); setOpportunities(d || []); }
    catch (e) { setBrowseError(e.message); }
    finally { setLoadingOpp(false); }
  };

  const handleSelectCategory = async (cat) => {
    setSelected(cat); setNicheData(null); setLoadingNiche(true); setBrowseError(null);
    try { const d = await nichesAPI.analyze(cat, apiCountry); setNicheData(d); setBrowseTab('top_free'); }
    catch (e) { setBrowseError(e.message); }
    finally { setLoadingNiche(false); }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    const sid = ++searchIdRef.current;
    setSearchResult(null); setAllApps([]); setSearchError(null);
    setLoadingSearch(true); setLoadingBatches(false); setBatchProgress(0);
    setFilters(DEFAULT_FILTERS); setSortKey('default');

    try {
      // Batch 0 — exact query, show results immediately
      const d = await nichesAPI.search(query.trim(), apiCountry, 0);
      if (searchIdRef.current !== sid) return;
      setSearchResult(d);
      const seen = new Set((d.apps || []).map(a => a.appId));
      setAllApps(d.apps || []);
      setLoadingSearch(false);

      // Build queue: suggestions + alphabet expansions (a-z) — keeps going until exhausted
      let suggestions = [];
      try {
        const s = await keywordsAPI.suggest(query.trim(), apiCountry);
        suggestions = s.play || [];
      } catch {}

      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
      const queue = [
        ...suggestions.map(q => ({ q, batch: 0 })),
        ...alphabet.map(l => ({ q: `${query.trim()} ${l}`, batch: 0 })),
      ];

      setLoadingBatches(true);
      let emptyRuns = 0;
      for (const item of queue) {
        if (searchIdRef.current !== sid) break;
        if (emptyRuns >= 5) break; // stop after 5 consecutive searches with no new apps
        try {
          const bd = await nichesAPI.search(item.q, apiCountry, item.batch);
          if (searchIdRef.current !== sid) break;
          const fresh = (bd.apps || []).filter(a => {
            if (seen.has(a.appId)) return false;
            seen.add(a.appId);
            return true;
          });
          if (fresh.length) { setAllApps(prev => [...prev, ...fresh]); emptyRuns = 0; }
          else emptyRuns++;
        } catch { emptyRuns++; }
      }
    } catch (err) {
      if (searchIdRef.current === sid) {
        setSearchError(err.message);
        setLoadingSearch(false);
      }
    } finally {
      if (searchIdRef.current === sid) {
        setLoadingBatches(false);
        setBatchProgress(0);
      }
    }
  };

  const handleCheckApps = async () => {
    const ids = removedInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!ids.length) return;
    setRemovedResults(null); setRemovedError(null); setLoadingRemoved(true);
    try { const d = await nichesAPI.checkApps(ids, apiCountry); setRemovedResults(d.results); }
    catch (e) { setRemovedError(e.message); }
    finally { setLoadingRemoved(false); }
  };

  const keywordFiltered = applyKeywordFilter(allApps, query);
  const filteredApps    = applySort(applyFilters(keywordFiltered, filters), sortKey);
  const activeFilters = countActiveFilters(filters);

  const verdictStyle = v =>
    v === 'High Opportunity'     ? 'text-green-400  bg-green-400/10  border-green-400/25' :
    v === 'Moderate Opportunity' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' :
                                   'text-red-400    bg-red-400/10    border-red-400/25';

  const browseTabs = nicheData ? [
    { id: 'top_free',     label: 'Top Free',     count: nicheData.topFree?.length },
    { id: 'top_paid',     label: 'Top Paid',     count: nicheData.topPaid?.length },
    { id: 'top_grossing', label: 'Top Grossing', count: nicheData.topGrossing?.length },
  ] : [];

  const suggestions = [
    'meditation', 'habit tracker', 'budget planner', 'language learning',
    'sleep sounds', 'workout timer', 'calorie counter', 'journal',
  ];

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Niche Explorer"
        subtitle="Deep app market analysis — demand, competition, ASO quality, revenue signals"
        action={<CountrySelect value={country} onChange={setCountry} />}
      />

      {/* Mode tabs */}
      <div className="flex bg-ink-800 border border-ink-700 rounded-lg p-0.5 w-fit mb-6">
        {[
          { id: 'finder',  label: '⚡ Niche Finder' },
          { id: 'browse',  label: '📂 Categories' },
          { id: 'removed', label: '🗑️ Removed Apps' },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-all',
              mode === m.id ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'
            )}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ─── NICHE FINDER ──────────────────────────────────────────────────── */}
      {mode === 'finder' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-2 mb-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder='Search any niche — "meditation", "habit tracker", "budget planner"…'
                className="input pl-9 w-full" />
            </div>
            <button type="submit" className="btn-primary px-5" disabled={!query.trim() || loadingSearch}>
              Analyze
            </button>
          </form>

          {!searchResult && !loadingSearch && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-xs text-ink-600">Try:</span>
              {suggestions.map(s => (
                <button key={s} onClick={() => setQuery(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-ink-700 text-ink-400 hover:text-ink-200 hover:border-ink-500 transition-all">
                  {s}
                </button>
              ))}
            </div>
          )}

          {loadingSearch && (
            <LoadingState message={`Fetching full app data for "${query}"… this takes ~15s on first load`} />
          )}
          {searchError && <ErrorState message={searchError} onRetry={handleSearch} />}

          {!searchResult && !loadingSearch && !searchError && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-acid/10 flex items-center justify-center">
                <Zap size={24} className="text-acid" />
              </div>
              <div>
                <p className="text-ink-200 font-medium">Deep niche analysis</p>
                <p className="text-sm text-ink-500 mt-1 max-w-md">
                  Demand, Competition, ASO score, revenue estimates, full filters, and sortable data — everything an ASO specialist needs.
                </p>
              </div>
            </div>
          )}

          {searchResult && !loadingSearch && (
            <div>
              {/* Metrics card */}
              {searchResult.metrics && (() => {
                const m = searchResult.metrics;
                return (
                  <div className="card mb-5 p-5">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                        <ScoreRing score={m.opportunityScore} size="lg" />
                        <span className="text-xs text-ink-500">Opportunity</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                          <h2 className="font-display text-lg font-bold text-ink-50">"{searchResult.query}"</h2>
                          <span className={clsx('text-xs px-2.5 py-1 rounded-full border font-medium', verdictStyle(m.verdict))}>
                            {m.verdict}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5 max-w-sm">
                          <MetricBar label="Demand"      value={m.demandScore} />
                          <MetricBar label="Competition" value={m.competitionScore} invert />
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          {[
                            { v: `${m.avgRating}★`,        l: 'Avg Rating',    c: 'text-yellow-400' },
                            { v: allApps.length,            l: 'Apps Found',    c: 'text-ink-100' },
                            { v: m.weakAppsCount,           l: 'Weak <4★',      c: 'text-red-400' },
                            { v: m.strongAppsCount,         l: 'Strong',        c: 'text-green-400' },
                            { v: m.abandonedCount,          l: 'Abandoned 1yr+',c: 'text-orange-400' },
                            { v: m.avgASOScore,             l: 'Avg ASO',       c: 'text-blue-400' },
                          ].map(({ v, l, c }, i, arr) => (
                            <div key={l} className="flex items-center gap-4">
                              <div className="text-center">
                                <p className={clsx('font-display text-lg font-bold', c)}>{v}</p>
                                <p className="text-xs text-ink-500">{l}</p>
                              </div>
                              {i < arr.length - 1 && <div className="w-px h-7 bg-ink-700" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Controls row */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <button onClick={() => setShowFilters(p => !p)}
                  className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                    showFilters
                      ? 'border-acid/40 bg-acid/5 text-acid'
                      : 'border-ink-700 text-ink-400 hover:text-ink-200'
                  )}>
                  <SlidersHorizontal size={13} />
                  Filters
                  {activeFilters > 0 && (
                    <span className="bg-acid text-ink-900 text-xs font-bold px-1.5 rounded-full leading-4">{activeFilters}</span>
                  )}
                </button>

<select value={sortKey} onChange={e => setSortKey(e.target.value)} className="select text-sm">
                  {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {activeFilters > 0 && (
                  <button onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-300 transition-all">
                    <X size={11} /> Clear filters
                  </button>
                )}

                <div className="ml-auto flex items-center gap-3">
                  {loadingBatches && (
                    <span className="text-xs text-ink-500 flex items-center gap-1.5">
                      <RefreshCw size={11} className="animate-spin text-acid" />
                      Loading more…
                    </span>
                  )}
                  <span className="text-xs text-ink-500">{filteredApps.length} apps</span>
                  <div className="flex bg-ink-800 border border-ink-700 rounded-lg p-0.5">
                    {[
                      { id: 'table', icon: <Table2 size={13} /> },
                      { id: 'cards', icon: <LayoutGrid size={13} /> },
                    ].map(v => (
                      <button key={v.id} onClick={() => setViewMode(v.id)}
                        className={clsx('px-2.5 py-1.5 rounded-md transition-all',
                          viewMode === v.id ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'
                        )}>
                        {v.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="card mb-4 p-4 border-acid/20">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

                    <div>
                      <p className="section-label mb-2">Min Rating</p>
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="5" step="0.5"
                          value={filters.minRating}
                          onChange={e => setFilters(p => ({ ...p, minRating: parseFloat(e.target.value) }))}
                          className="flex-1 accent-[#c8f135] h-1.5" />
                        <span className="text-xs font-mono text-acid w-8 text-right">
                          {filters.minRating > 0 ? `${filters.minRating}★` : 'Any'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="section-label mb-2">Min Installs</p>
                      <select value={filters.minInstalls}
                        onChange={e => setFilters(p => ({ ...p, minInstalls: +e.target.value }))}
                        className="select text-sm w-full">
                        {INSTALL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <p className="section-label mb-2">Price</p>
                      <div className="flex gap-1.5">
                        {['all','free','paid'].map(p => (
                          <button key={p} onClick={() => setFilters(prev => ({ ...prev, priceType: p }))}
                            className={clsx('px-2.5 py-1 rounded text-xs font-medium border transition-all capitalize',
                              filters.priceType === p
                                ? 'border-acid/40 bg-acid/10 text-acid'
                                : 'border-ink-700 text-ink-400 hover:text-ink-200'
                            )}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="section-label mb-2">Last Updated</p>
                      <select value={filters.updateRange}
                        onChange={e => setFilters(p => ({ ...p, updateRange: e.target.value }))}
                        className="select text-sm w-full">
                        {UPDATE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <p className="section-label mb-2">App Age</p>
                      <select value={filters.ageRange}
                        onChange={e => setFilters(p => ({ ...p, ageRange: e.target.value }))}
                        className="select text-sm w-full">
                        {AGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <p className="section-label mb-2">Screenshots</p>
                      <select value={filters.minScreenshots}
                        onChange={e => setFilters(p => ({ ...p, minScreenshots: +e.target.value }))}
                        className="select text-sm w-full">
                        {SCREENSHOT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <p className="section-label mb-2">Features</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'hasVideo',      label: 'Has Video',       icon: <Video        size={10} className="text-blue-400" /> },
                          { key: 'hasIAP',        label: 'Has IAP',         icon: <ShoppingCart size={10} className="text-purple-400" /> },
                          { key: 'adFree',        label: 'Ad-Free Only',    icon: <Megaphone    size={10} className="text-orange-400" /> },
                          { key: 'editorsChoice', label: "Editor's Choice", icon: <Award        size={10} className="text-yellow-400" /> },
                        ].map(({ key, label, icon }) => (
                          <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={filters[key]}
                              onChange={e => setFilters(p => ({ ...p, [key]: e.target.checked }))}
                              className="accent-[#c8f135]" />
                            {icon}
                            <span className="text-xs text-ink-400">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Results */}
              {filteredApps.length === 0 ? (
                <EmptyState title="No apps match these filters" subtitle="Try relaxing your filter criteria" />
              ) : viewMode === 'table' ? (

                /* TABLE VIEW */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-700">
                        {['#', 'App', 'Rating', 'Installs', 'ASO', 'Updated', 'Age', 'Screens', 'Features', 'Revenue Est.', 'Price'].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-xs font-medium text-ink-500 whitespace-nowrap first:pl-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map((app, i) => (
                        <tr key={app.appId} className="border-b border-ink-800/60 hover:bg-ink-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-xs text-ink-600 font-mono first:pl-0">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <img src={app.icon} alt="" className="w-8 h-8 rounded-lg flex-shrink-0 bg-ink-700"
                                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=2a2a27&color=a8a8a2&size=32`; }} />
                              <div>
                                <p className="text-ink-100 font-medium text-xs whitespace-nowrap max-w-[160px] truncate">{app.title}</p>
                                <p className="text-ink-500 text-xs max-w-[160px] truncate">{app.developer}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <p className="text-yellow-400 text-xs">{(app.score || 0).toFixed(1)}★</p>
                            <p className="text-ink-600 text-xs">{app.reviews >= 1000 ? `${(app.reviews / 1000).toFixed(0)}K` : app.reviews}</p>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-ink-300 font-mono whitespace-nowrap">{app.installs}</td>
                          <td className="py-2.5 px-3"><ASOBadge score={app.asoScore} /></td>
                          <td className="py-2.5 px-3"><AgeBadge days={app.daysSinceUpdate} label={false} /></td>
                          <td className="py-2.5 px-3"><AgeBadge days={app.daysSinceRelease} label={false} /></td>
                          <td className="py-2.5 px-3 text-xs text-ink-400 font-mono">{app.screenshotCount || '—'}</td>
                          <td className="py-2.5 px-3"><FeatureIcons app={app} /></td>
                          <td className="py-2.5 px-3"><Revenue value={app.revenueEstimate} /></td>
                          <td className="py-2.5 px-3 text-xs text-ink-400">{app.free ? 'Free' : `$${(app.price || 0).toFixed(2)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              ) : (

                /* CARD VIEW */
                <div className="grid grid-cols-2 gap-3">
                  {filteredApps.map(app => (
                    <div key={app.appId} className="card p-3">
                      <div className="flex items-start gap-3 mb-3">
                        <img src={app.icon} alt="" className="w-10 h-10 rounded-xl flex-shrink-0 bg-ink-700"
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=2a2a27&color=a8a8a2&size=40`; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-100 truncate">{app.title}</p>
                          <p className="text-xs text-ink-500 truncate">{app.developer}</p>
                        </div>
                        <ASOBadge score={app.asoScore} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-2 py-2 border-y border-ink-700">
                        <div>
                          <p className="text-xs text-yellow-400">{(app.score || 0).toFixed(1)}★</p>
                          <p className="text-xs text-ink-600">{app.reviews >= 1000 ? `${(app.reviews/1000).toFixed(0)}K` : app.reviews || 0} rev</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-300 font-mono truncate">{app.installs}</p>
                          <p className="text-xs text-ink-600">installs</p>
                        </div>
                        <div>
                          <AgeBadge days={app.daysSinceUpdate} label={false} />
                          <p className="text-xs text-ink-600">updated</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <FeatureIcons app={app} />
                        <Revenue value={app.revenueEstimate} />
                        <span className="text-xs text-ink-500">{app.free ? 'Free' : `$${(app.price||0).toFixed(2)}`}</span>
                      </div>
                      {app.screenshotCount > 0 && (
                        <p className="text-xs text-ink-600 mt-1.5">{app.screenshotCount} screenshots · {app.titleLength}ch title · {app.descriptionLength >= 1000 ? `${(app.descriptionLength/1000).toFixed(1)}K` : app.descriptionLength}ch desc</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── CATEGORY BROWSER ──────────────────────────────────────────────── */}
      {mode === 'browse' && (
        <div className="flex gap-6">
          <div className="w-52 flex-shrink-0">
            <p className="section-label mb-3">Categories</p>
            <div className="space-y-0.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {categories.map(cat => {
                const opp = opportunities.find(o => o.category === cat.id);
                return (
                  <button key={cat.id} onClick={() => handleSelectCategory(cat.id)}
                    className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between',
                      selected === cat.id
                        ? 'bg-acid/15 text-acid'
                        : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800'
                    )}>
                    <span className="truncate">{cat.name}</span>
                    {opp && (
                      <span className={clsx('text-xs font-mono ml-1 flex-shrink-0',
                        opp.opportunityScore >= 70 ? 'text-green-400' :
                        opp.opportunityScore >= 50 ? 'text-yellow-400' : 'text-ink-500'
                      )}>{opp.opportunityScore}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1">
            {!selected && (
              <div>
                <p className="section-label mb-4 flex items-center gap-2"><TrendingUp size={12} /> Opportunity Ranking</p>
                {loadingOpp ? <LoadingState message="Scanning all categories…" /> :
                 browseError ? <ErrorState message={browseError} onRetry={loadOpportunities} /> : (
                  <div className="grid grid-cols-2 gap-3">
                    {opportunities.map(opp => (
                      <button key={opp.category} onClick={() => handleSelectCategory(opp.category)}
                        className="card text-left hover:border-ink-500 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-ink-100">{opp.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-ink-500">Avg <span className="text-yellow-400">{opp.avgRating}★</span></span>
                              <span className="text-xs text-ink-500">{opp.lowRatedCount} weak</span>
                            </div>
                          </div>
                          <ScoreRing score={opp.opportunityScore} size="sm" label="opp" />
                        </div>
                        {opp.topApp && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ink-700">
                            <img src={opp.topApp.icon} className="w-5 h-5 rounded" alt="" />
                            <span className="text-xs text-ink-500 truncate">{opp.topApp.title}</span>
                            <span className="text-xs text-yellow-400 ml-auto">{opp.topApp.score}★</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selected && (
              loadingNiche ? <LoadingState message={`Analyzing ${selected}…`} /> :
              browseError  ? <ErrorState message={browseError} /> :
              nicheData && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-bold text-ink-50">{nicheData.categoryName}</h2>
                      <p className="text-sm text-ink-400 mt-0.5">
                        Avg rating {nicheData.stats.free.avgRating}★ · {nicheData.stats.free.lowRatedCount} weak apps
                      </p>
                    </div>
                    <ScoreRing score={nicheData.opportunityScore} size="md" label="Opportunity" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="card text-center">
                      <p className="font-display text-xl font-bold text-ink-50">{nicheData.topFree?.length}</p>
                      <p className="text-xs text-ink-500 mt-1">Top Free Apps</p>
                    </div>
                    <div className="card text-center">
                      <p className="font-display text-xl font-bold text-yellow-400">{nicheData.stats.free.avgRating}</p>
                      <p className="text-xs text-ink-500 mt-1">Avg Rating</p>
                    </div>
                    <div className="card text-center">
                      <p className="font-display text-xl font-bold text-red-400">{nicheData.stats.free.lowRatedCount}</p>
                      <p className="text-xs text-ink-500 mt-1">Apps Below 4★</p>
                    </div>
                  </div>
                  <TabBar tabs={browseTabs} active={browseTab} onChange={setBrowseTab} />
                  <div className="grid grid-cols-2 gap-3">
                    {(browseTab === 'top_free' ? nicheData.topFree :
                      browseTab === 'top_paid' ? nicheData.topPaid :
                      nicheData.topGrossing
                    )?.map(app => <AppCard key={app.appId} app={app} />)}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ─── REMOVED APPS ──────────────────────────────────────────────────── */}
      {mode === 'removed' && (
        <div className="max-w-2xl">
          <div className="card mb-5 p-4">
            <p className="text-sm text-ink-300 mb-1 font-medium">Check app availability on Google Play</p>
            <p className="text-xs text-ink-500 mb-3">
              Paste app IDs (e.g. <code className="bg-ink-700 px-1 py-0.5 rounded text-acid">com.headspace.android</code>),
              one per line or comma-separated. Removed apps signal market gaps.
            </p>
            <textarea
              value={removedInput}
              onChange={e => setRemovedInput(e.target.value)}
              placeholder={"com.headspace.android\ncom.calm.android\ncom.someapp.removed"}
              className="w-full h-28 bg-ink-900 border border-ink-700 rounded-lg p-3 text-sm text-ink-200 font-mono resize-none focus:outline-none focus:border-acid/50 mb-3"
            />
            <button onClick={handleCheckApps}
              disabled={!removedInput.trim() || loadingRemoved}
              className="btn-primary flex items-center gap-2">
              <RefreshCw size={13} className={clsx(loadingRemoved && 'animate-spin')} />
              {loadingRemoved ? 'Checking…' : 'Check Apps'}
            </button>
          </div>

          {removedError && <ErrorState message={removedError} />}

          {removedResults && (
            <div>
              <div className="flex items-center gap-4 mb-3 text-xs text-ink-500">
                <span className="text-green-400 font-medium">{removedResults.filter(r => r.status === 'live').length} live</span>
                <span className="text-red-400 font-medium">{removedResults.filter(r => r.status === 'removed').length} removed</span>
                <span className="text-ink-400">{removedResults.filter(r => r.status === 'error').length} errors</span>
              </div>
              <div className="space-y-2">
                {removedResults.map(r => (
                  <div key={r.appId} className={clsx('flex items-center gap-3 p-3 rounded-xl border',
                    r.status === 'live'    ? 'border-green-500/20 bg-green-500/5' :
                    r.status === 'removed' ? 'border-red-500/20  bg-red-500/5'   :
                                             'border-ink-700 bg-ink-800'
                  )}>
                    {r.status === 'live' ? (
                      <>
                        <img src={r.icon} alt="" className="w-9 h-9 rounded-xl flex-shrink-0"
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.title||'?')}&background=2a2a27&color=a8a8a2&size=36`; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-100 truncate">{r.title}</p>
                          <p className="text-xs text-ink-500 truncate">{r.developer} · {r.installs} · updated <AgeBadge days={r.daysSinceUpdate} label={false} /></p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-yellow-400">{(r.score||0).toFixed(1)}★</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">Live</span>
                        </div>
                      </>
                    ) : r.status === 'removed' ? (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <Trash2 size={16} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-400 font-mono truncate">{r.appId}</p>
                          <p className="text-xs text-ink-600">No longer on Google Play — market gap opportunity</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex-shrink-0">Removed</span>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-ink-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-ink-400">?</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-400 font-mono truncate">{r.appId}</p>
                          <p className="text-xs text-ink-600 truncate">{r.error}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ink-700 border border-ink-600 text-ink-400 flex-shrink-0">Error</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
