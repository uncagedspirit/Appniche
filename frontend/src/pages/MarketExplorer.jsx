import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nichesAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import {
  PageHeader, CountrySelect, LoadingState, ErrorState, ScoreRing, TabBar, EmptyState,
} from '../components/UI.jsx';
import {
  Search, SlidersHorizontal, X, RefreshCw, Table2, LayoutGrid, AlignJustify,
  Settings2, TrendingUp, Trash2, GripVertical, Lock, ChevronUp, ChevronDown,
  Video, ShoppingCart, Megaphone, Award, Star, ExternalLink, Calendar,
  DollarSign, Package, Zap,
} from 'lucide-react';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CATALOGUE  (columns available in the table view)
// ─────────────────────────────────────────────────────────────────────────────
const METRIC_GROUPS = [
  {
    group: 'Performance',
    items: [
      { id: 'minInstalls',      label: 'Installs',        avail: true },
      { id: 'dailyInstalls',    label: 'Daily Installs',  avail: true },
      { id: 'monthlyInstalls',  label: 'Monthly Installs',avail: true },
      { id: 'revenueEstimate',  label: 'Revenue Est.',    avail: true },
      { id: 'asoScore',         label: 'ASO Score',       avail: true },
    ],
  },
  {
    group: 'Ratings',
    items: [
      { id: 'score',   label: 'Rating',       avail: true },
      { id: 'reviews', label: 'Reviews',      avail: true },
      { id: 'ratings', label: 'Rating Votes', avail: true },
    ],
  },
  {
    group: 'Releases',
    items: [
      { id: 'released', label: 'Release Date', avail: true },
      { id: 'updated',  label: 'Last Updated', avail: true },
    ],
  },
  {
    group: 'Store Presence',
    items: [
      { id: 'developer',     label: 'Developer',     avail: true },
      { id: 'category',      label: 'Category',      avail: true },
      { id: 'screenshots',   label: 'Screenshots',   avail: true },
      { id: 'trailer',       label: 'Trailer',       avail: true },
      { id: 'version',       label: 'Version',       avail: true },
      { id: 'androidVersion',label: 'Android Ver.',  avail: true },
      { id: 'size',          label: 'App Size',      avail: true },
      { id: 'contentRating', label: 'Content Rating',avail: true },
      { id: 'description',   label: 'Description',   avail: true },
      { id: 'summary',       label: 'Short Desc',    avail: true },
      { id: 'googlePlayLink',label: 'Play Store Link',avail: true },
    ],
  },
  {
    group: 'Monetization',
    items: [
      { id: 'offersIAP',  label: 'In-App Purchases', avail: true },
      { id: 'adSupported',label: 'Ad Supported',     avail: true },
      { id: 'price',      label: 'Price',            avail: true },
    ],
  },
];

const METRIC_MAP = {};
METRIC_GROUPS.forEach(g => g.items.forEach(m => { METRIC_MAP[m.id] = m; }));

const DEFAULT_METRICS = ['minInstalls', 'score', 'updated', 'revenueEstimate', 'asoScore', 'offersIAP', 'adSupported'];

const SORTABLE_IDS = new Set([
  'minInstalls','dailyInstalls','monthlyInstalls','revenueEstimate','asoScore',
  'score','ratings','reviews','released','updated','price',
]);

// ─────────────────────────────────────────────────────────────────────────────
// FILTER + SORT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const INSTALL_OPTS = [
  { v: 0,       l: 'Any' },
  { v: 1_000,   l: '1K+' },
  { v: 10_000,  l: '10K+' },
  { v: 100_000, l: '100K+' },
  { v: 1_000_000, l: '1M+' },
  { v: 10_000_000, l: '10M+' },
];
const DAILY_MIN_OPTS = [
  { v: 0,  l: 'Any' },{ v: 1,  l: '1+' },{ v: 10,  l: '10+' },
  { v: 100, l: '100+' },{ v: 1000, l: '1K+' },{ v: 10000, l: '10K+' },
];
const DAILY_MAX_OPTS = [
  { v: 0, l: 'Any' },{ v: 10, l: '10' },{ v: 100, l: '100' },
  { v: 1000, l: '1K' },{ v: 10000, l: '10K' },{ v: 100000, l: '100K' },
];
const UPDATE_OPTS = [
  { v: 'any',  l: 'Any time' },{ v: '30', l: 'Last 30 days' },{ v: '90', l: 'Last 90 days' },
  { v: '180', l: 'Last 6 months' },{ v: '365', l: 'Last year' },{ v: '365+', l: '1yr+ old' },
];
const RELEASE_OPTS = [
  { v: 'any', l: 'Any' },{ v: '30', l: 'Last 30d' },{ v: '90', l: '90 days' },
  { v: '365', l: '1 year' },{ v: '365+', l: '1yr+ ago' },
];
const CONTENT_OPTS = [
  { v: 'all', l: 'All ages' },{ v: 'Everyone', l: 'Everyone' },
  { v: 'Teen', l: 'Teen' },{ v: 'Mature 17+', l: 'Mature 17+' },
];
const SCREENSHOT_OPTS = [{ v: 0, l: 'Any' },{ v: 3, l: '3+' },{ v: 5, l: '5+' },{ v: 8, l: '8+' }];
const SORT_OPTS = [
  { value: 'default',      label: 'Default order' },
  { value: 'installs_desc',label: 'Most installs' },
  { value: 'installs_asc', label: 'Fewest installs' },
  { value: 'rating_desc',  label: 'Rating — high' },
  { value: 'rating_asc',   label: 'Rating — low' },
  { value: 'aso_desc',     label: 'ASO Score — best' },
  { value: 'aso_asc',      label: 'ASO Score — worst' },
  { value: 'updated_asc',  label: 'Recently updated' },
  { value: 'updated_desc', label: 'Least recently updated' },
  { value: 'age_asc',      label: 'Newest apps first' },
  { value: 'revenue_desc', label: 'Revenue — high' },
];

const FILTER_DEFAULTS = {
  minRating: 0, minInstalls: 0, dailyMin: 0, dailyMax: 0,
  priceType: 'all', updateRange: 'any', releaseRange: 'any',
  hasIAP: false, hasAds: false, adFree: false, editorsChoice: false,
  hasVideo: false, minScreenshots: 0, contentRating: 'all',
};

function applyFilters(apps, f) {
  return apps.filter(a => {
    if (f.minRating > 0 && (a.score || 0) < f.minRating) return false;
    if (f.minInstalls > 0 && (a.minInstalls || 0) < f.minInstalls) return false;
    if (f.dailyMin > 0 && (a.dailyInstalls || 0) < f.dailyMin) return false;
    if (f.dailyMax > 0 && (a.dailyInstalls || 0) > f.dailyMax) return false;
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
    if (f.hasIAP && !a.offersIAP) return false;
    if (f.hasAds && !a.adSupported) return false;
    if (f.adFree && a.adSupported) return false;
    if (f.editorsChoice && !a.editorsChoice) return false;
    if (f.hasVideo && !a.hasVideo) return false;
    if (f.minScreenshots > 0 && (a.screenshotCount || 0) < f.minScreenshots) return false;
    if (f.contentRating !== 'all' && a.contentRating !== f.contentRating) return false;
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
      case 'rating':   av = a.score || 0;           bv = b.score || 0;           break;
      case 'installs': av = a.minInstalls || 0;      bv = b.minInstalls || 0;     break;
      case 'aso':      av = a.asoScore || 0;         bv = b.asoScore || 0;        break;
      case 'updated':  av = a.daysSinceUpdate ?? 9999;  bv = b.daysSinceUpdate ?? 9999;  break;
      case 'age':      av = a.daysSinceRelease ?? 9999; bv = b.daysSinceRelease ?? 9999; break;
      case 'revenue':  av = a.revenueEstimate || 0;  bv = b.revenueEstimate || 0; break;
      default: return 0;
    }
    return asc ? av - bv : bv - av;
  });
}

function applyKeywordFilter(apps, query, enabled) {
  if (!enabled || !query) return apps;
  const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return apps;
  return apps.filter(app => words.every(w => (app.title || '').toLowerCase().includes(w)));
}

function countActiveFilters(f) {
  return Object.keys(f).filter(k => f[k] !== FILTER_DEFAULTS[k]).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}
function fmtRevenue(n) {
  if (!n) return '—';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
}
function fmtDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }
  catch { return str; }
}
function ageDays(d) {
  if (d == null) return '—';
  if (d < 1) return 'Today';
  if (d < 30) return d + 'd';
  if (d < 365) return Math.round(d / 30) + 'mo';
  return (d / 365).toFixed(1) + 'yr';
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Nil() { return <span className="text-slate-400 text-xs">—</span>; }
function N({ children }) { return <span className="font-medium text-slate-700">{children}</span>; }

function Pill({ c, children }) {
  const m = {
    green:  'bg-green-50 text-green-700 ring-green-200',
    blue:   'bg-blue-50 text-blue-700 ring-blue-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    slate:  'bg-slate-100 text-slate-600 ring-slate-200',
    red:    'bg-red-50 text-red-700 ring-red-200',
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${m[c] || m.slate}`}>{children}</span>;
}

function ASOBadge({ score }) {
  const s = score ?? 0;
  const c = s >= 70 ? 'bg-green-50 text-green-700 ring-green-200'
          : s >= 40 ? 'bg-amber-50 text-amber-700 ring-amber-200'
          :           'bg-red-50 text-red-700 ring-red-200';
  return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ring-1 ${c}`}>{s}</span>;
}

function UpdateAge({ days }) {
  if (days == null) return <Nil />;
  const c = days <= 30 ? 'text-green-600' : days <= 90 ? 'text-emerald-600' : days <= 365 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-xs font-medium ${c}`}>{ageDays(days)}</span>;
}

function MetricBar({ label, value, invert = false }) {
  const good = invert ? value < 45 : value >= 70;
  const mid  = invert ? value < 70 : value >= 45;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={clsx('text-xs font-mono font-bold',
          good ? 'text-green-600' : mid ? 'text-amber-600' : 'text-red-600'
        )}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-700',
          good ? 'bg-green-500' : mid ? 'bg-amber-500' : 'bg-red-500'
        )} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CELL RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function CellValue({ app, id }) {
  switch (id) {
    case 'minInstalls':     return <N>{fmtNum(app.minInstalls)}</N>;
    case 'dailyInstalls':   return <N>{fmtNum(app.dailyInstalls)}</N>;
    case 'monthlyInstalls': return <N>{fmtNum(app.monthlyInstalls)}</N>;
    case 'revenueEstimate': return app.revenueEstimate
      ? <span className="font-semibold text-emerald-700">{fmtRevenue(app.revenueEstimate)}</span> : <Nil />;
    case 'asoScore':        return <ASOBadge score={app.asoScore} />;
    case 'score':
      return app.score > 0
        ? <span className="flex items-center gap-1">
            <Star size={11} className="text-amber-500 fill-amber-500" />
            <span className="font-semibold text-slate-700">{app.score.toFixed(1)}</span>
            {app.reviews > 0 && <span className="text-[11px] text-slate-400">({fmtNum(app.reviews)})</span>}
          </span>
        : <Nil />;
    case 'ratings':         return <span className="text-slate-600">{fmtNum(app.ratings)}</span>;
    case 'reviews':         return <span className="text-slate-600">{fmtNum(app.reviews)}</span>;
    case 'released':        return <span className="text-xs text-slate-500">{fmtDate(app.released)}</span>;
    case 'updated':         return <UpdateAge days={app.daysSinceUpdate} />;
    case 'developer':       return <span className="text-xs text-slate-600 block max-w-[130px] truncate">{app.developer || '—'}</span>;
    case 'category':        return <span className="text-xs text-slate-600">{app.genre || '—'}</span>;
    case 'screenshots':     return <span className="text-sm text-slate-600">{app.screenshotCount ?? '—'}</span>;
    case 'trailer':         return app.hasVideo ? <Pill c="purple">Yes</Pill> : <span className="text-xs text-slate-400">No</span>;
    case 'offersIAP':       return app.offersIAP  ? <Pill c="blue">Yes</Pill>   : <span className="text-xs text-slate-400">No</span>;
    case 'adSupported':     return app.adSupported ? <Pill c="orange">Yes</Pill> : <span className="text-xs text-slate-400">No</span>;
    case 'price':           return app.free !== false
      ? <Pill c="green">Free</Pill>
      : <span className="text-xs font-semibold text-slate-700 flex items-center gap-0.5"><DollarSign size={9}/>{(app.price||0).toFixed(2)}</span>;
    case 'version':         return <span className="text-xs text-slate-600">{app.version || '—'}</span>;
    case 'androidVersion':  return <span className="text-xs text-slate-600">{app.androidVersion || '—'}</span>;
    case 'size':            return <span className="text-xs text-slate-600">{app.size || '—'}</span>;
    case 'contentRating':   return <span className="text-xs text-slate-600">{app.contentRating || '—'}</span>;
    case 'description':     return app.descriptionSnippet
      ? <span className="text-xs text-slate-600 block max-w-[200px] line-clamp-2">{app.descriptionSnippet}</span> : <Nil />;
    case 'summary':         return app.summaryText
      ? <span className="text-xs text-slate-600 block max-w-[180px] truncate">{app.summaryText}</span> : <Nil />;
    case 'googlePlayLink':  return app.appId
      ? <a href={`https://play.google.com/store/apps/details?id=${app.appId}`} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs flex items-center gap-1"><ExternalLink size={10}/>Play</a>
      : <Nil />;
    default: return <Nil />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS PICKER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function MetricsPicker({ selected, onApply, onClose }) {
  const [tmp, setTmp] = useState([...selected]);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const toggle = id => {
    if (!METRIC_MAP[id]?.avail) return;
    setTmp(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const filtered = search
    ? METRIC_GROUPS.map(g => ({ ...g, items: g.items.filter(m => m.label.toLowerCase().includes(search.toLowerCase())) })).filter(g => g.items.length)
    : METRIC_GROUPS;

  const onDragStart = (e, id) => { setDragging(id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragEnter = id => { if (dragging && dragging !== id) setDragOver(id); };
  const onDragEnd   = () => { setDragging(null); setDragOver(null); };
  const onDrop      = targetId => {
    if (!dragging || dragging === targetId) return;
    setTmp(s => {
      const a = [...s], fi = a.indexOf(dragging), ti = a.indexOf(targetId);
      a.splice(fi, 1); a.splice(ti, 0, dragging); return a;
    });
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: 680, maxHeight: '86vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-[15px] font-bold text-slate-800">Customize columns</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select metrics and drag to reorder</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={16}/></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col border-r border-slate-200 flex-shrink-0" style={{ width: 260 }}>
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search metrics…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white text-slate-800"/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
              {filtered.map(({ group, items }) => (
                <div key={group}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">{group}</p>
                  {items.map(m => (
                    <button key={m.id} onClick={() => toggle(m.id)} disabled={!m.avail}
                      className={clsx('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
                        !m.avail ? 'opacity-40 cursor-not-allowed' :
                        tmp.includes(m.id) ? 'bg-blue-50' : 'hover:bg-slate-50')}>
                      {!m.avail
                        ? <Lock size={11} className="text-slate-400 flex-shrink-0"/>
                        : tmp.includes(m.id)
                          ? <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center flex-shrink-0"><X size={8} className="text-white"/></span>
                          : <span className="w-4 h-4 rounded border border-slate-300 flex-shrink-0"/>}
                      <span className={clsx('text-xs', !m.avail ? 'text-slate-400' : tmp.includes(m.id) ? 'text-blue-700 font-medium' : 'text-slate-700')}>{m.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-slate-700">{tmp.length} columns selected</span>
              <button onClick={() => setTmp([])} className="text-xs text-blue-600 hover:underline font-medium">Clear all</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Column name</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {tmp.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-400">Select columns from the left panel</div>
                  )}
                  {tmp.map(id => {
                    const m = METRIC_MAP[id];
                    return (
                      <div key={id} draggable
                        onDragStart={e => onDragStart(e, id)} onDragEnter={() => onDragEnter(id)}
                        onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(id)}
                        className={clsx('flex items-center gap-3 px-3 py-2.5 bg-white cursor-grab active:cursor-grabbing transition-colors',
                          dragOver === id ? 'bg-blue-50' : 'hover:bg-slate-50')}>
                        <GripVertical size={14} className="text-slate-300 flex-shrink-0"/>
                        <span className="text-sm text-slate-700 flex-1">{m?.label || id}</span>
                        <button onClick={() => setTmp(s => s.filter(x => x !== id))} className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded">
                          <X size={13}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={() => onApply(tmp)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Apply</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SortTh({ id, label, sort, onSort }) {
  const active = sort.key === id;
  const sortable = SORTABLE_IDS.has(id);
  return (
    <th onClick={() => sortable && onSort(id)}
      className={clsx('px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap min-w-[110px] select-none',
        sortable ? 'cursor-pointer' : '',
        active ? 'text-blue-600 bg-blue-50/60' : 'text-slate-500 hover:text-slate-700')}>
      <span className="flex items-center gap-1">
        {label}
        {active && (sort.dir === 'desc' ? <ChevronDown size={11}/> : <ChevronUp size={11}/>)}
      </span>
    </th>
  );
}

function TableView({ apps, metrics, sort, onSort }) {
  return (
    <div className="overflow-x-auto overflow-y-auto">
      <table className="text-sm bg-white w-full" style={{ minWidth: 'max-content' }}>
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="pl-5 pr-2 py-3 text-xs font-semibold text-slate-400 text-left w-10 sticky left-0 bg-slate-50 z-30">#</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left sticky bg-slate-50 z-30 min-w-[220px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]" style={{ left: 40 }}>App</th>
            {metrics.map(id => {
              const m = METRIC_MAP[id];
              return m ? <SortTh key={id} id={id} label={m.label} sort={sort} onSort={onSort}/> : null;
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apps.length === 0 && (
            <tr><td colSpan={metrics.length + 2} className="py-20 text-center text-sm text-slate-400">No apps match your filters.</td></tr>
          )}
          {apps.map((app, i) => (
            <tr key={app.appId} className="hover:bg-blue-50/20 transition-colors group">
              <td className="pl-5 pr-2 py-3 text-xs text-slate-400 font-medium sticky left-0 bg-white group-hover:bg-blue-50/20 z-10">{i + 1}</td>
              <td className="px-3 py-3 sticky bg-white group-hover:bg-blue-50/20 z-10 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.05)]" style={{ left: 40 }}>
                <div className="flex items-center gap-3">
                  <img src={app.icon} alt={app.title} className="w-9 h-9 rounded-xl bg-slate-100 object-cover flex-shrink-0"
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=36`; }}/>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate max-w-[160px]">{app.title}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[160px]">{app.developer}</p>
                  </div>
                </div>
              </td>
              {metrics.map(id => (
                <td key={id} className="px-3 py-3 whitespace-nowrap"><CellValue app={app} id={id}/></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GridView({ apps }) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {apps.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 text-sm">No apps match your filters.</div>}
        {apps.map(app => (
          <div key={app.appId} className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-blue-200 transition-all">
            <div className="flex justify-center mb-3">
              <img src={app.icon} alt={app.title} className="w-14 h-14 rounded-2xl bg-slate-100 object-cover shadow-sm"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=56`; }}/>
            </div>
            <p className="text-[11px] font-bold text-slate-800 text-center truncate">{app.title}</p>
            <p className="text-[10px] text-slate-400 text-center truncate mt-0.5">{app.developer}</p>
            {app.genre && <div className="mt-1.5 text-center"><span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">{app.genre}</span></div>}
            <div className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">{fmtNum(app.minInstalls)}</span>
                {app.score > 0 && <span className="text-amber-500 font-semibold">★ {app.score.toFixed(1)}</span>}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{app.daysSinceRelease ? ageDays(app.daysSinceRelease) + ' old' : '—'}</span>
                <span style={{ color: app.daysSinceUpdate <= 30 ? '#16a34a' : app.daysSinceUpdate <= 90 ? '#059669' : app.daysSinceUpdate <= 365 ? '#d97706' : '#dc2626' }}>
                  {ageDays(app.daysSinceUpdate)}
                </span>
              </div>
              {app.revenueEstimate > 0 && <p className="text-[10px] text-emerald-700 font-semibold text-center">{fmtRevenue(app.revenueEstimate)}/mo</p>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {app.free !== false ? <Pill c="green">FREE</Pill> : <Pill c="slate">${(app.price||0).toFixed(2)}</Pill>}
              {app.offersIAP && <Pill c="blue">IAP</Pill>}
              {app.adSupported && <Pill c="orange">ADS</Pill>}
              {app.hasVideo && <Pill c="purple">VID</Pill>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullView({ apps }) {
  return (
    <div className="divide-y divide-slate-100 bg-white">
      {apps.length === 0 && <div className="py-20 text-center text-slate-400 text-sm">No apps match your filters.</div>}
      {apps.map(app => (
        <div key={app.appId} className="px-5 py-5 hover:bg-slate-50/50 transition-colors">
          <div className="flex items-start gap-4">
            <img src={app.icon} alt={app.title} className="w-16 h-16 rounded-2xl bg-slate-100 object-cover flex-shrink-0 shadow-sm"
              onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=64`; }}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-base font-bold text-slate-800">{app.title}</h3>
                {app.editorsChoice && <Pill c="slate">Editor's Choice</Pill>}
              </div>
              <p className="text-sm text-slate-500">{app.developer}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap text-slate-500">
                {app.released && <span className="flex items-center gap-1"><Calendar size={10}/>Released {ageDays(app.daysSinceRelease)} ago</span>}
                {app.genre && <span className="text-blue-600 font-medium">{app.genre}</span>}
                {app.contentRating && <span>{app.contentRating}</span>}
                {app.score > 0 && <span className="flex items-center gap-1 text-amber-600 font-bold"><Star size={10} className="fill-amber-500"/>{app.score.toFixed(1)}</span>}
                {app.adSupported && <span className="text-orange-600 font-medium">ads</span>}
                {app.offersIAP && <span className="text-blue-600 font-medium">iap</span>}
              </div>
              <div className="flex items-center gap-5 mt-2 text-xs flex-wrap">
                {app.minInstalls > 0 && <span><span className="text-slate-400">Installs </span><N>{fmtNum(app.minInstalls)}</N></span>}
                {app.dailyInstalls && <span><span className="text-slate-400">Daily </span><N>{fmtNum(app.dailyInstalls)}</N></span>}
                {app.revenueEstimate && <span><span className="text-slate-400">Revenue </span><span className="font-semibold text-emerald-700">{fmtRevenue(app.revenueEstimate)}/mo</span></span>}
                {app.asoScore != null && <span><span className="text-slate-400">ASO </span><ASOBadge score={app.asoScore}/></span>}
              </div>
            </div>
            <a href={`https://play.google.com/store/apps/details?id=${app.appId}`} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
              <ExternalLink size={15}/>
            </a>
          </div>
          {app.screenshotUrls?.length > 0 && (
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {app.screenshotUrls.slice(0, 8).map((url, i) => (
                  <img key={i} src={url} alt="" className="h-40 w-auto rounded-xl object-cover flex-shrink-0 border border-slate-100"/>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER PANEL
// ─────────────────────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange }) {
  const set = (k, v) => onChange(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Min Rating</label>
          <div className="flex items-center gap-2">
            <input type="range" min="0" max="5" step="0.5" value={filters.minRating}
              onChange={e => set('minRating', parseFloat(e.target.value))}
              className="flex-1 accent-blue-600 h-1.5"/>
            <span className="text-xs font-mono text-blue-600 w-8 text-right font-bold">
              {filters.minRating > 0 ? `${filters.minRating}★` : 'Any'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Min Installs</label>
          <select value={filters.minInstalls} onChange={e => set('minInstalls', +e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
            {INSTALL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Daily Installs</label>
          <div className="flex gap-1">
            <select value={filters.dailyMin} onChange={e => set('dailyMin', +e.target.value)}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
              {DAILY_MIN_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={filters.dailyMax} onChange={e => set('dailyMax', +e.target.value)}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
              {DAILY_MAX_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price</label>
          <div className="flex gap-1.5">
            {['all','free','paid'].map(p => (
              <button key={p} onClick={() => set('priceType', p)}
                className={clsx('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize',
                  filters.priceType === p
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}>{p}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Last Updated</label>
          <select value={filters.updateRange} onChange={e => set('updateRange', e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
            {UPDATE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Released</label>
          <select value={filters.releaseRange} onChange={e => set('releaseRange', e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
            {RELEASE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Screenshots</label>
          <select value={filters.minScreenshots} onChange={e => set('minScreenshots', +e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
            {SCREENSHOT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Content Rating</label>
          <select value={filters.contentRating} onChange={e => set('contentRating', e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
            {CONTENT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Features</label>
          <div className="grid grid-cols-3 gap-y-2 gap-x-3">
            {[
              { key: 'hasIAP',       label: 'Has IAP',         icon: <ShoppingCart size={11} className="text-blue-500"/> },
              { key: 'hasAds',       label: 'Has Ads',         icon: <Megaphone    size={11} className="text-orange-500"/> },
              { key: 'adFree',       label: 'Ad-Free Only',    icon: <Megaphone    size={11} className="text-slate-400"/> },
              { key: 'hasVideo',     label: 'Has Video',       icon: <Video        size={11} className="text-purple-500"/> },
              { key: 'editorsChoice',label: "Editor's Choice", icon: <Award        size={11} className="text-amber-500"/> },
            ].map(({ key, label, icon }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={filters[key]}
                  onChange={e => set(key, e.target.checked)}
                  className="accent-blue-600"/>
                {icon}
                <span className="text-xs text-slate-600">{label}</span>
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'meditation', 'habit tracker', 'budget planner', 'language learning',
  'sleep sounds', 'workout timer', 'calorie counter', 'journal',
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MarketExplorer() {
  const [searchParams] = useSearchParams();
  const { country, setCountry } = useSettings();
  const apiCountry = country === 'all' ? 'us' : country;

  const [mode, setMode] = useState('search'); // 'search' | 'categories' | 'check'

  // ── Search state ───────────────────────────────────────────────────────────
  const [query,         setQuery]         = useState('');
  const [searchResult,  setSearchResult]  = useState(null);
  const [allApps,       setAllApps]       = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError,   setSearchError]   = useState(null);
  const [fetchingMore,  setFetchingMore]  = useState(false);
  const searchIdRef  = useRef(0);
  const seenIdsRef   = useRef(new Set());
  const nextPageRef  = useRef(1);

  // ── Display state ──────────────────────────────────────────────────────────
  const [filters,       setFilters]       = useState(FILTER_DEFAULTS);
  const [sortKey,       setSortKey]       = useState('default');
  const [viewMode,      setViewMode]      = useState('table');
  const [showFilters,   setShowFilters]   = useState(false);
  const [showPicker,    setShowPicker]    = useState(false);
  const [metrics,       setMetrics]       = useState(DEFAULT_METRICS);
  const [titleOnly,     setTitleOnly]     = useState(false);
  const [tableSort,     setTableSort]     = useState({ key: 'minInstalls', dir: 'desc' });

  // ── Categories state ───────────────────────────────────────────────────────
  const [categories,    setCategories]    = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedCat,   setSelectedCat]   = useState(null);
  const [catData,       setCatData]       = useState(null);
  const [loadingOpp,    setLoadingOpp]    = useState(false);
  const [loadingCat,    setLoadingCat]    = useState(false);
  const [catError,      setCatError]      = useState(null);
  const [catTab,        setCatTab]        = useState('top_free');

  // ── Check apps state ───────────────────────────────────────────────────────
  const [checkInput,    setCheckInput]    = useState('');
  const [checkResults,  setCheckResults]  = useState(null);
  const [loadingCheck,  setLoadingCheck]  = useState(false);
  const [checkError,    setCheckError]    = useState(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    nichesAPI.categories().then(setCategories).catch(() => {});
    loadOpportunities();
    const cat = searchParams.get('cat');
    if (cat) { setMode('categories'); handleSelectCategory(cat); }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (query.trim() && searchResult) handleSearch();
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Opportunities ───────────────────────────────────────────────────────────
  const loadOpportunities = async () => {
    setLoadingOpp(true); setCatError(null);
    try { const d = await nichesAPI.opportunities(apiCountry); setOpportunities(d || []); }
    catch (e) { setCatError(e.message); }
    finally { setLoadingOpp(false); }
  };

  const handleSelectCategory = async (cat) => {
    setSelectedCat(cat); setCatData(null); setLoadingCat(true); setCatError(null);
    try { const d = await nichesAPI.analyze(cat, apiCountry); setCatData(d); setCatTab('top_free'); }
    catch (e) { setCatError(e.message); }
    finally { setLoadingCat(false); }
  };

  // ── Background fetch (never-ending, stops only on empty batch) ─────────────
  const runBackgroundFetch = async (q, c, sid) => {
    setFetchingMore(true);
    const BATCH = 5;
    while (searchIdRef.current === sid) {
      const start = nextPageRef.current;
      const pages = Array.from({ length: BATCH }, (_, i) => start + i);
      let anyNew = false;
      await Promise.all(pages.map(async (pageNum) => {
        try {
          const res = await nichesAPI.search(q, c, pageNum);
          if (searchIdRef.current !== sid) return;
          const fresh = (res.apps || []).filter(a => !seenIdsRef.current.has(a.appId));
          fresh.forEach(a => seenIdsRef.current.add(a.appId));
          if (fresh.length) { setAllApps(prev => [...prev, ...fresh]); anyNew = true; }
        } catch { /* page failure is non-fatal */ }
      }));
      nextPageRef.current += BATCH;
      if (!anyNew) break;
    }
    if (searchIdRef.current === sid) setFetchingMore(false);
  };

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    const sid = ++searchIdRef.current;
    seenIdsRef.current = new Set();
    nextPageRef.current = 1;
    setSearchResult(null); setAllApps([]); setSearchError(null);
    setLoadingSearch(true); setFetchingMore(false);
    setFilters(FILTER_DEFAULTS); setSortKey('default');

    try {
      const base = await nichesAPI.search(query.trim(), apiCountry, 0);
      if (searchIdRef.current !== sid) return;
      base.apps.forEach(a => seenIdsRef.current.add(a.appId));
      setSearchResult(base);
      setAllApps(base.apps || []);
      setLoadingSearch(false);
      runBackgroundFetch(query.trim(), apiCountry, sid);
    } catch (err) {
      if (searchIdRef.current === sid) {
        setSearchError(err.message);
        setLoadingSearch(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!fetchingMore && searchResult)
      runBackgroundFetch(query.trim(), apiCountry, searchIdRef.current);
  };

  // ── Check apps ──────────────────────────────────────────────────────────────
  const handleCheckApps = async () => {
    const ids = checkInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!ids.length) return;
    setCheckResults(null); setCheckError(null); setLoadingCheck(true);
    try { const d = await nichesAPI.checkApps(ids, apiCountry); setCheckResults(d.results); }
    catch (e) { setCheckError(e.message); }
    finally { setLoadingCheck(false); }
  };

  // ── Derived display data ────────────────────────────────────────────────────
  const keywordFiltered = applyKeywordFilter(allApps, query, titleOnly);
  const filteredApps    = applySort(applyFilters(keywordFiltered, filters), sortKey);
  const activeFilters   = countActiveFilters(filters);

  const handleTableSort = key =>
    setTableSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });

  const verdictColor = v =>
    v === 'High Opportunity'     ? 'text-green-700 bg-green-50 border-green-200 ring-green-200' :
    v === 'Moderate Opportunity' ? 'text-amber-700 bg-amber-50 border-amber-200 ring-amber-200' :
                                   'text-red-700 bg-red-50 border-red-200 ring-red-200';

  const browseTabs = catData ? [
    { id: 'top_free',     label: 'Top Free',     count: catData.topFree?.length },
    { id: 'top_paid',     label: 'Top Paid',     count: catData.topPaid?.length },
    { id: 'top_grossing', label: 'Top Grossing', count: catData.topGrossing?.length },
  ] : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Market Explorer</h1>
            <p className="text-xs text-slate-500 mt-0.5">Deep app market intelligence — demand, competition, revenue signals, ASO quality</p>
          </div>
          <CountrySelect value={country} onChange={setCountry} />
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'search',     label: 'Niche Search',    icon: <Search size={13}/> },
            { id: 'categories', label: 'Category Browser',icon: <TrendingUp size={13}/> },
            { id: 'check',      label: 'Check Apps',      icon: <Package size={13}/> },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                mode === m.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}>
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── NICHE SEARCH ──────────────────────────────────────────────────── */}
      {mode === 'search' && (
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Search bar */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder='Search any niche — "meditation", "habit tracker", "budget planner"…'
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"/>
              </div>
              <button type="submit" disabled={!query.trim() || loadingSearch}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Analyze
              </button>
            </form>

            {!searchResult && !loadingSearch && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-slate-400">Try:</span>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setQuery(s); }}
                    className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading / Error */}
          {loadingSearch && (
            <div className="flex-1 flex items-center justify-center">
              <LoadingState message={`Fetching every app for "${query}" across all query variants…`} />
            </div>
          )}
          {searchError && (
            <div className="p-6"><ErrorState message={searchError} onRetry={handleSearch} /></div>
          )}

          {/* Empty state */}
          {!searchResult && !loadingSearch && !searchError && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Zap size={28} className="text-blue-500"/>
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-slate-800 font-bold text-lg">Deep niche analysis</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Search any keyword to surface demand scores, competition levels, ASO quality, and revenue signals across thousands of apps — with fully customizable columns and filters.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-lg w-full">
                {[
                  { icon: <TrendingUp size={16} className="text-green-500"/>, label: 'Opportunity Score', desc: 'Demand vs. competition at a glance' },
                  { icon: <Settings2 size={16} className="text-blue-500"/>,   label: 'Custom Columns',   desc: 'Pick any metric, drag to reorder' },
                  { icon: <Search size={16} className="text-purple-500"/>,    label: '2000+ Apps',        desc: 'Deep background fetch across all variants' },
                ].map(f => (
                  <div key={f.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-2">{f.icon}</div>
                    <p className="text-xs font-semibold text-slate-700">{f.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {searchResult && !loadingSearch && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Opportunity metrics card */}
              {searchResult.metrics && (() => {
                const m = searchResult.metrics;
                return (
                  <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <ScoreRing score={m.opportunityScore} size="lg" />
                        <p className="text-[11px] text-slate-400 text-center mt-1">Opportunity</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h2 className="font-bold text-lg text-slate-800">"{searchResult.query}"</h2>
                          <span className={clsx('text-xs px-3 py-1 rounded-full font-semibold ring-1', verdictColor(m.verdict))}>
                            {m.verdict}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 max-w-xs">
                          <MetricBar label="Demand"      value={m.demandScore} />
                          <MetricBar label="Competition" value={m.competitionScore} invert />
                        </div>
                        <div className="flex items-center gap-5 flex-wrap">
                          {[
                            { v: `${m.avgRating}★`,  l: 'Avg Rating',     c: 'text-amber-600' },
                            { v: allApps.length,       l: 'Apps Found',     c: 'text-slate-800' },
                            { v: m.weakAppsCount,      l: 'Weak <4★',       c: 'text-red-600' },
                            { v: m.strongAppsCount,    l: 'Strong',         c: 'text-green-600' },
                            { v: m.abandonedCount,     l: 'Abandoned 1yr+', c: 'text-orange-600' },
                            { v: m.avgASOScore,        l: 'Avg ASO',        c: 'text-blue-600' },
                          ].map(({ v, l, c }, i, arr) => (
                            <div key={l} className="flex items-center gap-5">
                              <div className="text-center">
                                <p className={clsx('text-lg font-bold tabular-nums', c)}>{v}</p>
                                <p className="text-[11px] text-slate-400">{l}</p>
                              </div>
                              {i < arr.length - 1 && <div className="w-px h-8 bg-slate-200"/>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Controls toolbar */}
              <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 flex-wrap flex-shrink-0">

                <button onClick={() => setShowFilters(p => !p)}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                    showFilters ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50')}>
                  <SlidersHorizontal size={13}/>
                  Filters
                  {activeFilters > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full">{activeFilters}</span>
                  )}
                </button>

                <button onClick={() => setTitleOnly(p => !p)}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                    titleOnly ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50')}>
                  <Search size={13}/>
                  Title match {titleOnly ? 'ON' : 'OFF'}
                </button>

                <select value={sortKey} onChange={e => setSortKey(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
                  {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {activeFilters > 0 && (
                  <button onClick={() => setFilters(FILTER_DEFAULTS)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                    <X size={11}/> Clear filters
                  </button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button onClick={handleLoadMore}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                      fetchingMore ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50')}>
                    <RefreshCw size={12} className={fetchingMore ? 'animate-spin' : ''}/>
                    {fetchingMore ? `Fetching… ${allApps.length}` : `${allApps.length} apps`}
                  </button>

                  <span className="text-xs text-slate-400 font-medium">{filteredApps.length} visible</span>

                  {/* View toggle */}
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {[
                      { id: 'table', icon: <Table2 size={14}/> },
                      { id: 'grid',  icon: <LayoutGrid size={14}/> },
                      { id: 'full',  icon: <AlignJustify size={14}/> },
                    ].map(v => (
                      <button key={v.id} onClick={() => setViewMode(v.id)}
                        className={clsx('px-2.5 py-1.5 rounded-md transition-all',
                          viewMode === v.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        )}>
                        {v.icon}
                      </button>
                    ))}
                  </div>

                  {/* Columns picker (table only) */}
                  {viewMode === 'table' && (
                    <button onClick={() => setShowPicker(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium transition-all">
                      <Settings2 size={13}/>
                      Columns
                    </button>
                  )}
                </div>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="px-4 pt-3 flex-shrink-0 bg-slate-50">
                  <FilterPanel filters={filters} onChange={setFilters} />
                </div>
              )}

              {/* Results area */}
              <div className="flex-1 overflow-y-auto bg-white">
                {viewMode === 'table' && (
                  <TableView apps={filteredApps} metrics={metrics} sort={tableSort} onSort={handleTableSort}/>
                )}
                {viewMode === 'grid' && <GridView apps={filteredApps}/>}
                {viewMode === 'full' && <FullView apps={filteredApps}/>}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ─── CATEGORY BROWSER ──────────────────────────────────────────────── */}
      {mode === 'categories' && (
        <div className="flex-1 overflow-hidden flex">

          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">App Categories</p>
            </div>
            <div className="flex-1 overflow-y-auto py-1.5 px-2">
              {categories.map(cat => {
                const opp = opportunities.find(o => o.category === cat.id);
                return (
                  <button key={cat.id} onClick={() => handleSelectCategory(cat.id)}
                    className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between mb-0.5',
                      selectedCat === cat.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )}>
                    <span className="truncate">{cat.name}</span>
                    {opp && (
                      <span className={clsx('text-[11px] font-bold font-mono ml-1 flex-shrink-0',
                        opp.opportunityScore >= 70 ? 'text-green-600' :
                        opp.opportunityScore >= 50 ? 'text-amber-600' : 'text-slate-400'
                      )}>{opp.opportunityScore}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedCat && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">Category Opportunities</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Ranked by opportunity score — demand vs. competition</p>
                  </div>
                </div>
                {loadingOpp ? <LoadingState message="Scanning all categories…" /> :
                 catError ? <ErrorState message={catError} onRetry={loadOpportunities} /> : (
                  <div className="grid grid-cols-2 gap-3">
                    {opportunities.map(opp => (
                      <button key={opp.category} onClick={() => handleSelectCategory(opp.category)}
                        className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{opp.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">Avg <span className="text-amber-600 font-medium">{opp.avgRating}★</span></span>
                              <span className="text-xs text-slate-500">{opp.lowRatedCount} weak apps</span>
                            </div>
                          </div>
                          <ScoreRing score={opp.opportunityScore} size="sm" label="opp" />
                        </div>
                        {opp.topApp && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                            <img src={opp.topApp.icon} className="w-5 h-5 rounded" alt="" />
                            <span className="text-xs text-slate-500 truncate">{opp.topApp.title}</span>
                            <span className="text-xs text-amber-600 font-medium ml-auto">{opp.topApp.score}★</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedCat && (
              loadingCat ? <LoadingState message={`Analyzing ${selectedCat}…`} /> :
              catError ? <ErrorState message={catError} /> :
              catData && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <button onClick={() => setSelectedCat(null)} className="text-xs text-slate-400 hover:text-blue-600 transition-colors mb-1 flex items-center gap-1">
                        ← All categories
                      </button>
                      <h2 className="font-bold text-slate-800 text-xl">{catData.categoryName}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Avg {catData.stats.free.avgRating}★ · {catData.stats.free.lowRatedCount} apps below 4★
                      </p>
                    </div>
                    <ScoreRing score={catData.opportunityScore} size="md" label="Opportunity" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                      { v: catData.topFree?.length, l: 'Top Free Apps', c: 'text-slate-800' },
                      { v: catData.stats.free.avgRating, l: 'Avg Rating', c: 'text-amber-600', suffix: '★' },
                      { v: catData.stats.free.lowRatedCount, l: 'Below 4★', c: 'text-red-600' },
                    ].map(({ v, l, c, suffix }) => (
                      <div key={l} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className={clsx('text-2xl font-bold', c)}>{v}{suffix}</p>
                        <p className="text-xs text-slate-500 mt-1">{l}</p>
                      </div>
                    ))}
                  </div>

                  <TabBar tabs={browseTabs} active={catTab} onChange={setCatTab} />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {(catTab === 'top_free'     ? catData.topFree :
                      catTab === 'top_paid'     ? catData.topPaid :
                      catData.topGrossing
                    )?.map(app => (
                      <div key={app.appId} className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <img src={app.icon} alt="" className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0"
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=40`; }}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{app.title}</p>
                            <p className="text-xs text-slate-500 truncate">{app.developer}</p>
                          </div>
                          {app.score > 0 && (
                            <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5 flex-shrink-0">
                              <Star size={10} className="fill-amber-500"/>{app.score.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          {app.installs && <span>{app.installs}</span>}
                          {app.daysSinceUpdate != null && <UpdateAge days={app.daysSinceUpdate}/>}
                          {app.free !== false ? <Pill c="green">Free</Pill> : <Pill c="slate">${(app.price||0).toFixed(2)}</Pill>}
                          {app.offersIAP && <Pill c="blue">IAP</Pill>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ─── CHECK APPS ────────────────────────────────────────────────────── */}
      {mode === 'check' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Check App Availability on Google Play</h3>
              <p className="text-xs text-slate-500 mb-4">
                Paste app IDs (e.g. <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">com.headspace.android</code>), one per line or comma-separated.
                Removed apps signal market gaps — someone built it, someone wanted it, and it's gone.
              </p>
              <textarea
                value={checkInput}
                onChange={e => setCheckInput(e.target.value)}
                placeholder={"com.headspace.android\ncom.calm.android\ncom.someapp.removed"}
                className="w-full h-28 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 font-mono resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-3"/>
              <button onClick={handleCheckApps}
                disabled={!checkInput.trim() || loadingCheck}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <RefreshCw size={13} className={clsx(loadingCheck && 'animate-spin')}/>
                {loadingCheck ? 'Checking…' : 'Check Apps'}
              </button>
            </div>

            {checkError && <ErrorState message={checkError} />}

            {checkResults && (
              <div>
                <div className="flex items-center gap-4 mb-3 text-xs font-medium">
                  <span className="text-green-600">{checkResults.filter(r => r.status === 'live').length} live</span>
                  <span className="text-red-600">{checkResults.filter(r => r.status === 'removed').length} removed</span>
                  <span className="text-slate-400">{checkResults.filter(r => r.status === 'error').length} errors</span>
                </div>
                <div className="space-y-2">
                  {checkResults.map(r => (
                    <div key={r.appId} className={clsx('flex items-center gap-3 p-3 rounded-xl border',
                      r.status === 'live'    ? 'border-green-200 bg-green-50/50' :
                      r.status === 'removed' ? 'border-red-200 bg-red-50/50'   :
                                               'border-slate-200 bg-white'
                    )}>
                      {r.status === 'live' ? (
                        <>
                          <img src={r.icon} alt="" className="w-9 h-9 rounded-xl flex-shrink-0"
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.title||'?')}&background=e2e8f0&color=475569&size=36`; }}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{r.title}</p>
                            <p className="text-xs text-slate-500 truncate">{r.developer} · {r.installs}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-amber-600">{(r.score||0).toFixed(1)}★</span>
                            <Pill c="green">Live</Pill>
                          </div>
                        </>
                      ) : r.status === 'removed' ? (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <Trash2 size={16} className="text-red-500"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-600 font-mono truncate">{r.appId}</p>
                            <p className="text-xs text-slate-400">Removed from Google Play — potential gap</p>
                          </div>
                          <Pill c="red">Removed</Pill>
                        </>
                      ) : (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-slate-400 text-sm">?</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-500 font-mono truncate">{r.appId}</p>
                            <p className="text-xs text-slate-400 truncate">{r.error}</p>
                          </div>
                          <Pill c="slate">Error</Pill>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics picker modal */}
      {showPicker && (
        <MetricsPicker
          selected={metrics}
          onApply={cols => { setMetrics(cols); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
