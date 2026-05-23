import { useState, useCallback } from 'react';
import { nichesAPI } from '../lib/api.js';
import clsx from 'clsx';
import {
  Search, SlidersHorizontal, ChevronUp, ChevronDown, X,
  LayoutGrid, AlignJustify, Table2, GripVertical, Lock,
  Star, Calendar, RefreshCw, DollarSign, TrendingUp, Zap,
  ExternalLink, Package, AlertCircle, Settings2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1.  COMPLETE METRIC CATALOGUE (every metric the user requested)
// ─────────────────────────────────────────────────────────────────────────────
const METRIC_GROUPS = [
  {
    group: 'Developer',
    items: [
      { id: 'developer',          label: 'Developer',            avail: true  },
      { id: 'developerId',        label: 'Developer ID',         avail: true  },
      { id: 'developerRevenue',   label: 'Developer Revenue',    avail: false },
      { id: 'developerInstalls',  label: 'Developer Installs',   avail: false },
      { id: 'developerReleased',  label: 'Developer Released',   avail: false },
      { id: 'developerTotalApps', label: 'Developer Total Apps', avail: false },
    ],
  },
  {
    group: 'Store Presence',
    items: [
      { id: 'storeTitle',       label: 'Name',            avail: true  },
      { id: 'category',         label: 'Category',        avail: true  },
      { id: 'type',             label: 'Type',            avail: true  },
      { id: 'size',             label: 'Size',            avail: true  },
      { id: 'storeDeveloper',   label: 'Developer',       avail: true  },
      { id: 'description',      label: 'Description',     avail: true  },
      { id: 'summary',          label: 'Short Desc',      avail: true  },
      { id: 'screenshots',      label: 'Screenshots',     avail: true  },
      { id: 'trailer',          label: 'Trailer',         avail: true  },
      { id: 'permissions',      label: 'Permissions',     avail: false },
      { id: 'contentRating',    label: 'Ages',            avail: true  },
      { id: 'tags',             label: 'Tags / Genre',    avail: true  },
      { id: 'featureGraphic',   label: 'Feature Graphic', avail: false },
      { id: 'version',          label: 'Version',         avail: true  },
      { id: 'androidVersion',   label: 'Android Version', avail: true  },
    ],
  },
  {
    group: 'Performance',
    items: [
      { id: 'dailyInstalls',      label: 'Daily Installs',          avail: true  },
      { id: 'minInstalls',        label: 'Installs Google',         avail: true  },
      { id: 'monthlyInstalls',    label: 'Monthly Installs',        avail: true  },
      { id: 'revenueEstimate',    label: 'Monthly Revenue',         avail: true  },
      { id: 'asoScore',           label: 'ASO Score',               avail: true  },
      { id: 'totalInstalls',      label: 'Total Installs',          avail: true  },
      { id: 'installsByCountry',  label: 'Installs by Country',     avail: false },
      { id: 'revenueByCountry',   label: 'Revenue by Country',      avail: false },
      { id: 'activeCountries',    label: 'Active Countries',        avail: false },
      { id: 'topFree',            label: 'Top Free',                avail: false },
      { id: 'topGrossing',        label: 'Top Grossing',            avail: false },
      { id: 'topPaid',            label: 'Top Paid',                avail: false },
      { id: 'topNewFree',         label: 'Top New Free',            avail: false },
      { id: 'topTrending',        label: 'Top Trending',            avail: false },
      { id: 'topNewPaid',         label: 'Top New Paid',            avail: false },
      { id: 'dailyInstallChart',  label: 'Daily Install Chart',     avail: false },
      { id: 'monthlyRevChart',    label: 'Monthly Revenue Chart',   avail: false },
      { id: 'monthlyInstChart',   label: 'Monthly Installs Chart',  avail: false },
    ],
  },
  {
    group: 'Releases',
    items: [
      { id: 'released',    label: 'Release Date',  avail: true  },
      { id: 'updated',     label: 'Last Updated',  avail: true  },
      { id: 'removedDate', label: 'Removed Date',  avail: false },
      { id: 'whatsNew',    label: "What's New",    avail: false },
    ],
  },
  {
    group: 'Ratings & Reviews',
    items: [
      { id: 'score',   label: 'Rating',       avail: true },
      { id: 'ratings', label: 'Rating Votes', avail: true },
      { id: 'reviews', label: 'Reviews',      avail: true },
    ],
  },
  {
    group: 'Transfers',
    items: [
      { id: 'transferDate',  label: 'Transfer Date',      avail: false },
      { id: 'prevDeveloper', label: 'Previous Developer', avail: false },
    ],
  },
  {
    group: 'Form Factors',
    items: [
      { id: 'formFactors', label: 'Form Factors', avail: false },
      { id: 'wearOS',      label: 'Wear OS',      avail: false },
    ],
  },
  {
    group: 'Monetization',
    items: [
      { id: 'offersIAP',    label: 'In-App Purchases',        avail: true  },
      { id: 'iapPriceMin',  label: 'IAP Price Min [US]',      avail: false },
      { id: 'iapPriceMax',  label: 'IAP Price Max [US]',      avail: false },
      { id: 'price',        label: 'Price',                   avail: true  },
      { id: 'priceDrop',    label: 'Price Drop',              avail: false },
      { id: 'priceSaleEnd', label: 'Price Sale End',          avail: false },
      { id: 'paywall',      label: 'Paywall',                 avail: false },
    ],
  },
  {
    group: 'User Acquisition',
    items: [
      { id: 'adSupported', label: 'Ads',        avail: true  },
      { id: 'advertized',  label: 'Advertised', avail: false },
    ],
  },
  {
    group: 'Contacts',
    items: [
      { id: 'contactAddress', label: 'Address', avail: false },
      { id: 'contactCountry', label: 'Country', avail: false },
      { id: 'contactWebsite', label: 'Website', avail: false },
      { id: 'contactPhone',   label: 'Phone',   avail: false },
      { id: 'contactEmail',   label: 'Emails',  avail: false },
    ],
  },
  {
    group: 'About the Developer',
    items: [
      { id: 'aboutDevCompany', label: "Developer's Company", avail: false },
      { id: 'aboutDevPhone',   label: "Developer's Phone",   avail: false },
      { id: 'aboutDevAddress', label: "Developer's Address", avail: false },
      { id: 'aboutDevEmail',   label: "Developer's Email",   avail: false },
    ],
  },
  {
    group: 'Visibility',
    items: [
      { id: 'similarApps',         label: 'Similar Apps',                avail: false },
      { id: 'reverseSimilarApps',  label: 'Reverse Similar Apps',        avail: false },
      { id: 'similarAppsPos',      label: 'Similar Apps Position',       avail: false },
      { id: 'reverseSimilarPos',   label: 'Reverse Similar Apps Pos.',   avail: false },
    ],
  },
  {
    group: 'Collections',
    items: [
      { id: 'collections', label: 'Collections', avail: false },
    ],
  },
  {
    group: 'Other',
    items: [
      { id: 'earlyAccess',     label: 'Early Access',        avail: false },
      { id: 'googlePlayLink',  label: 'Google Play Link',    avail: true  },
      { id: 'privacyPolicy',   label: 'Privacy Policy',      avail: false },
      { id: 'developerCat',    label: 'Developer Category',  avail: false },
      { id: 'developerType',   label: 'Developer Type',      avail: false },
      { id: 'contentRatingUS', label: 'Content Rating US',   avail: true  },
      { id: 'contentRatingGB', label: 'Content Rating GB',   avail: false },
      { id: 'preRegister',     label: 'Pre-Register',        avail: false },
      { id: 'sdk',             label: 'SDK',                 avail: false },
    ],
  },
];

const METRIC_MAP = {};
METRIC_GROUPS.forEach(g => g.items.forEach(m => { METRIC_MAP[m.id] = m; }));

const DEFAULT_METRICS = [
  'dailyInstalls', 'minInstalls', 'score', 'released',
  'updated', 'monthlyInstalls', 'revenueEstimate', 'asoScore',
];

// Metrics that map to the same sort key
const SORT_KEY = {
  storeTitle:     'title',     storeDeveloper: 'developer',
  totalInstalls:  'minInstalls', contentRatingUS: 'contentRating',
  tags:           'category',
};
const SORTABLE_IDS = new Set([
  'dailyInstalls','minInstalls','monthlyInstalls','revenueEstimate','asoScore',
  'totalInstalls','score','ratings','reviews','released','updated','price',
  'storeTitle','title','developer','storeDeveloper','category','tags',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 2.  FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null || n === 0) return '—';
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
  if (d < 30)  return d + 'd';
  if (d < 365) return Math.round(d / 30) + 'mo';
  return (d / 365).toFixed(1) + 'yr';
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  FILTER + SORT CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const FILTER_DEFAULTS = {
  minRating: 0, minInstalls: 0,
  dailyMin: 0, dailyMax: 0,
  priceType: 'all', updateRange: 'any', releaseRange: 'any',
  hasIAP: false, hasAds: false, editorsChoice: false, hasVideo: false,
  minScreenshots: 0, contentRating: 'all', status: 'all',
};
const RELEASE_OPTS = [{v:'any',l:'Any'},{v:'7',l:'Last week'},{v:'30',l:'30 days'},{v:'90',l:'90 days'},{v:'365',l:'1 year'},{v:'365+',l:'1yr+ ago'}];
const UPDATE_OPTS  = [{v:'any',l:'Any'},{v:'30',l:'30 days'},{v:'90',l:'90 days'},{v:'180',l:'6 months'},{v:'365',l:'1 year'},{v:'365+',l:'1yr+ old'}];
const INSTALL_OPTS = [{v:0,l:'Any'},{v:1e3,l:'1K+'},{v:1e4,l:'10K+'},{v:1e5,l:'100K+'},{v:1e6,l:'1M+'},{v:1e7,l:'10M+'}];
const DAILY_MIN_O  = [{v:0,l:'Min: Any'},{v:1,l:'Min: 1+'},{v:10,l:'Min: 10+'},{v:100,l:'Min: 100+'},{v:1e3,l:'Min: 1K+'},{v:1e4,l:'Min: 10K+'}];
const DAILY_MAX_O  = [{v:0,l:'Max: Any'},{v:10,l:'Max: 10'},{v:100,l:'Max: 100'},{v:1e3,l:'Max: 1K'},{v:1e4,l:'Max: 10K'},{v:1e5,l:'Max: 100K'},{v:1e6,l:'Max: 1M'}];
const CONTENT_OPTS = [{v:'all',l:'All'},{v:'Everyone',l:'Everyone'},{v:'Teen',l:'Teen'},{v:'Mature 17+',l:'Mature 17+'}];
const COUNTRIES    = [['us','🇺🇸 US'],['gb','🇬🇧 UK'],['in','🇮🇳 IN'],['de','🇩🇪 DE'],['fr','🇫🇷 FR'],['br','🇧🇷 BR'],['ca','🇨🇦 CA'],['au','🇦🇺 AU'],['jp','🇯🇵 JP'],['kr','🇰🇷 KR'],['mx','🇲🇽 MX'],['id','🇮🇩 ID']];

function applyFilters(apps, f) {
  return apps.filter(a => {
    if (f.status === 'live'    && a._status === 'removed') return false;
    if (f.status === 'removed' && a._status !== 'removed') return false;
    if (f.minRating   > 0 && (a.score       || 0) < f.minRating)    return false;
    if (f.minInstalls > 0 && (a.minInstalls  || 0) < f.minInstalls)  return false;
    if (f.dailyMin    > 0 && (a.dailyInstalls|| 0) < f.dailyMin)     return false;
    if (f.dailyMax    > 0 && (a.dailyInstalls|| 0) > f.dailyMax)     return false;
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

function sortKey(id) { return SORT_KEY[id] || id; }
function applySort(apps, { key, dir }) {
  if (!SORTABLE_IDS.has(key)) return apps;
  const sk = sortKey(key);
  return [...apps].sort((a, b) => {
    let va, vb;
    switch (sk) {
      case 'title':           va = (a.title||'').toLowerCase(); vb = (b.title||'').toLowerCase(); break;
      case 'developer':       va = (a.developer||'').toLowerCase(); vb = (b.developer||'').toLowerCase(); break;
      case 'score':           va = a.score           || 0; vb = b.score           || 0; break;
      case 'minInstalls':     va = a.minInstalls      || 0; vb = b.minInstalls      || 0; break;
      case 'dailyInstalls':   va = a.dailyInstalls    || 0; vb = b.dailyInstalls    || 0; break;
      case 'monthlyInstalls': va = a.monthlyInstalls  || 0; vb = b.monthlyInstalls  || 0; break;
      case 'revenueEstimate': va = a.revenueEstimate  || 0; vb = b.revenueEstimate  || 0; break;
      case 'released':        va = a.daysSinceRelease ?? 9e9; vb = b.daysSinceRelease ?? 9e9; break;
      case 'updated':         va = a.daysSinceUpdate  ?? 9e9; vb = b.daysSinceUpdate  ?? 9e9; break;
      case 'asoScore':        va = a.asoScore         || 0; vb = b.asoScore         || 0; break;
      case 'price':           va = a.price            || 0; vb = b.price            || 0; break;
      case 'reviews':         va = a.reviews          || 0; vb = b.reviews          || 0; break;
      case 'ratings':         va = a.ratings          || 0; vb = b.ratings          || 0; break;
      case 'category':        va = (a.genre||'').toLowerCase(); vb = (b.genre||'').toLowerCase(); break;
      default: return 0;
    }
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return dir === 'asc' ? va - vb : vb - va;
  });
}

function countActive(f) { return Object.keys(f).filter(k => f[k] !== FILTER_DEFAULTS[k]).length; }

// ─────────────────────────────────────────────────────────────────────────────
// 4.  CELL RENDERER  — renders a metric value for one app row
// ─────────────────────────────────────────────────────────────────────────────
function CellValue({ app, id }) {
  switch (id) {
    // Performance
    case 'dailyInstalls':    return <N>{fmtNum(app.dailyInstalls)}</N>;
    case 'minInstalls':
    case 'totalInstalls':    return <N>{fmtNum(app.minInstalls)}</N>;
    case 'monthlyInstalls':  return <N>{fmtNum(app.monthlyInstalls)}</N>;
    case 'revenueEstimate':  return app.revenueEstimate
      ? <span className="font-semibold text-emerald-700">{fmtRevenue(app.revenueEstimate)}</span> : <Nil/>;
    case 'asoScore':         return <ASOBadge score={app.asoScore}/>;
    // Ratings
    case 'score':
      return app.score > 0
        ? <span className="flex items-center gap-1"><Star size={11} className="text-amber-500 fill-amber-500"/><span className="font-semibold text-slate-700">{app.score.toFixed(1)}</span>{app.reviews > 0 && <span className="text-[11px] text-slate-400">({fmtNum(app.reviews)})</span>}</span>
        : <Nil/>;
    case 'ratings':          return <span className="text-slate-600">{fmtNum(app.ratings)}</span>;
    case 'reviews':          return <span className="text-slate-600">{fmtNum(app.reviews)}</span>;
    // Releases
    case 'released':         return <span className="text-xs text-slate-500">{fmtDate(app.released)}</span>;
    case 'updated':          return <UpdateAge days={app.daysSinceUpdate}/>;
    // Store Presence
    case 'storeTitle':       return <span className="font-medium text-slate-700 text-sm">{app.title}</span>;
    case 'storeDeveloper':
    case 'developer':        return <span className="text-xs text-slate-600 block max-w-[130px] truncate">{app.developer || '—'}</span>;
    case 'developerId':      return <span className="text-[11px] text-slate-500 font-mono block max-w-[130px] truncate">{app.developerId || '—'}</span>;
    case 'category':
    case 'tags':             return <span className="text-xs text-slate-600">{app.genre || '—'}</span>;
    case 'type':             return app.free !== false
      ? <Pill c="green">Free</Pill>
      : <Pill c="slate">Paid</Pill>;
    case 'size':             return <span className="text-xs text-slate-600">{app.size || '—'}</span>;
    case 'version':          return <span className="text-xs text-slate-600">{app.version || '—'}</span>;
    case 'androidVersion':   return <span className="text-xs text-slate-600">{app.androidVersion || '—'}</span>;
    case 'contentRating':
    case 'contentRatingUS':  return <span className="text-xs text-slate-600">{app.contentRating || '—'}</span>;
    case 'description':      return app.descriptionSnippet
      ? <span className="text-xs text-slate-600 block max-w-[200px] line-clamp-2">{app.descriptionSnippet}</span> : <Nil/>;
    case 'summary':          return app.summaryText
      ? <span className="text-xs text-slate-600 block max-w-[180px] truncate">{app.summaryText}</span> : <Nil/>;
    case 'screenshots':      return <span className="text-sm text-slate-600">{app.screenshotCount ?? '—'}</span>;
    case 'trailer':          return app.hasVideo ? <Pill c="purple">Yes</Pill> : <span className="text-xs text-slate-400">No</span>;
    // Monetization
    case 'offersIAP':        return app.offersIAP   ? <Pill c="blue">Yes</Pill>    : <span className="text-xs text-slate-400">No</span>;
    case 'adSupported':      return app.adSupported ? <Pill c="orange">Yes</Pill>  : <span className="text-xs text-slate-400">No</span>;
    case 'price':            return app.free !== false
      ? <Pill c="green">Free</Pill>
      : <span className="text-xs font-semibold text-slate-700 flex items-center gap-0.5"><DollarSign size={9}/>{(app.price||0).toFixed(2)}</span>;
    // Other
    case 'googlePlayLink':   return app.appId
      ? <a href={`https://play.google.com/store/apps/details?id=${app.appId}`} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs flex items-center gap-1"><ExternalLink size={10}/>Play</a>
      : <Nil/>;
    default:                 return <Nil/>;
  }
}
function Nil()           { return <span className="text-slate-400 text-xs">—</span>; }
function N({ children }) { return <span className="font-medium text-slate-700">{children}</span>; }
function Pill({ c, children }) {
  const m = {
    green:  'bg-green-50 text-green-700 ring-green-200',
    blue:   'bg-blue-50 text-blue-700 ring-blue-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    slate:  'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${m[c]||m.slate}`}>{children}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  SMALL UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function ASOBadge({ score }) {
  const s = score ?? 0;
  const c = s >= 70 ? 'bg-green-50 text-green-700 ring-green-200'
          : s >= 40 ? 'bg-amber-50 text-amber-700 ring-amber-200'
          :           'bg-red-50 text-red-700 ring-red-200';
  return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ring-1 ${c}`}>{s}</span>;
}
function UpdateAge({ days }) {
  if (days == null) return <Nil/>;
  const c = days <= 30 ? 'text-green-600' : days <= 90 ? 'text-emerald-600' : days <= 365 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-xs font-medium ${c}`}>{ageDays(days)}</span>;
}
function StatusBadge({ status }) {
  if (!status || status === 'unknown') return null;
  if (status === 'live')    return <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" title="Live"/>;
  if (status === 'removed') return <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded-full ring-1 ring-red-200">REMOVED</span>;
  return null;
}
function Sep() { return <div className="h-4 w-px bg-slate-200 flex-shrink-0"/>; }

// ─────────────────────────────────────────────────────────────────────────────
// 6.  METRICS PICKER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function MetricsPicker({ selected, onApply, onClose }) {
  const [tmp,      setTmp]      = useState([...selected]);
  const [search,   setSearch]   = useState('');
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const toggle = id => {
    if (!METRIC_MAP[id]?.avail) return;
    setTmp(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const filtered = search
    ? METRIC_GROUPS.map(g => ({ ...g, items: g.items.filter(m => m.label.toLowerCase().includes(search.toLowerCase())) })).filter(g => g.items.length)
    : METRIC_GROUPS;

  const onDragStart  = (e, id) => { setDragging(id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragEnter  = id => { if (dragging && dragging !== id) setDragOver(id); };
  const onDragEnd    = () => { setDragging(null); setDragOver(null); };
  const onDrop       = targetId => {
    if (!dragging || dragging === targetId) return;
    setTmp(s => {
      const a = [...s], fi = a.indexOf(dragging), ti = a.indexOf(targetId);
      a.splice(fi, 1); a.splice(ti, 0, dragging); return a;
    });
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: 700, maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-[15px] font-bold text-slate-800">Pick your metrics</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={16}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: grouped list */}
          <div className="flex flex-col border-r border-slate-200 flex-shrink-0" style={{ width: 260 }}>
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white text-slate-800"/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto market-scroll py-2 px-2 space-y-3">
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

          {/* RIGHT: selected, drag to reorder */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-slate-700">{tmp.length} selected</span>
              <button onClick={() => setTmp([])} className="text-xs text-blue-600 hover:underline font-medium">Clear all</button>
            </div>
            <div className="flex-1 overflow-y-auto market-scroll p-3">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Name</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {tmp.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-400">Select metrics from the left panel</div>
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

        {/* Footer — no "Suggest a metrics" button */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose}          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={() => onApply(tmp)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Apply</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7.  THREE VIEWS
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

/* ── TABLE ── */
function TableView({ apps, metrics, sort, onSort }) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto market-scroll">
      <table className="text-sm bg-white w-full" style={{ minWidth: 'max-content' }}>
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="pl-5 pr-2 py-3 text-xs font-semibold text-slate-400 text-left w-10 sticky left-0 bg-slate-100 z-30">#</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left sticky bg-slate-100 z-30 min-w-[220px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]" style={{ left: 40 }}>
              App
            </th>
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
            <tr key={app.appId} className={clsx('hover:bg-blue-50/25 transition-colors group', app._status === 'removed' ? 'bg-red-50/30' : '')}>
              <td className="pl-5 pr-2 py-3 text-xs text-slate-400 font-medium sticky left-0 bg-white group-hover:bg-blue-50/25 z-10">{i + 1}</td>
              <td className="px-3 py-3 sticky bg-white group-hover:bg-blue-50/25 z-10 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]" style={{ left: 40 }}>
                <div className="flex items-center gap-3">
                  <img src={app.icon} alt={app.title} className="w-9 h-9 rounded-xl bg-slate-100 object-cover flex-shrink-0"
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=36`; }}/>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800 text-sm truncate max-w-[140px]">{app.title}</p>
                      <StatusBadge status={app._status}/>
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-[140px]">{app.developer}</p>
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

/* ── GRID ── */
function GridView({ apps }) {
  return (
    <div className="flex-1 overflow-y-auto market-scroll p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {apps.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 text-sm">No apps match your filters.</div>}
        {apps.map(app => (
          <div key={app.appId} className={clsx('bg-white rounded-xl border p-3 hover:shadow-md transition-all',
            app._status === 'removed' ? 'border-red-200 bg-red-50/30' : 'border-slate-200')}>
            <div className="flex justify-center mb-3">
              <img src={app.icon} alt={app.title} className="w-16 h-16 rounded-2xl bg-slate-100 object-cover shadow-sm"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=64`; }}/>
            </div>
            {app._status === 'removed' && <div className="text-center mb-1"><span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full ring-1 ring-red-200">REMOVED</span></div>}
            <p className="text-[11px] font-bold text-slate-800 text-center truncate" title={app.title}>{app.title}</p>
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
              {app.offersIAP   && <Pill c="blue">IAP</Pill>}
              {app.adSupported && <Pill c="orange">ADS</Pill>}
              {app.hasVideo    && <Pill c="purple">VID</Pill>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FULL ── */
function FullView({ apps }) {
  return (
    <div className="flex-1 overflow-y-auto market-scroll divide-y divide-slate-100 bg-white">
      {apps.length === 0 && <div className="py-20 text-center text-slate-400 text-sm">No apps match your filters.</div>}
      {apps.map(app => (
        <div key={app.appId} className={clsx('px-5 py-5 transition-colors', app._status === 'removed' ? 'bg-red-50/25' : 'hover:bg-slate-50/50')}>
          <div className="flex items-start gap-4">
            <img src={app.icon} alt={app.title} className="w-16 h-16 rounded-2xl bg-slate-100 object-cover flex-shrink-0 shadow-sm"
              onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.title)}&background=e2e8f0&color=475569&size=64`; }}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-base font-bold text-slate-800">{app.title}</h3>
                <StatusBadge status={app._status}/>
                {app.editorsChoice && <Pill c="slate">Editor's Choice</Pill>}
              </div>
              <p className="text-sm text-slate-500">{app.developer}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap text-slate-500">
                {app.released   && <span className="flex items-center gap-1"><Calendar size={10}/>Released {ageDays(app.daysSinceRelease)} ago</span>}
                {app.genre      && <span className="text-blue-600 font-medium">{app.genre}</span>}
                {app.contentRating && <span>{app.contentRating}</span>}
                {app.score > 0  && <span className="flex items-center gap-1 text-amber-600 font-bold"><Star size={10} className="fill-amber-500"/>{app.score.toFixed(1)}</span>}
                {app.adSupported && <span className="text-orange-600 font-medium">ads</span>}
                {app.offersIAP  && <span className="text-blue-600 font-medium">iap</span>}
              </div>
              <div className="flex items-center gap-5 mt-2 text-xs flex-wrap">
                {app.minInstalls > 0 && <span><span className="text-slate-400">Installs </span><N>{fmtNum(app.minInstalls)}</N></span>}
                {app.dailyInstalls   && <span><span className="text-slate-400">Daily </span><N>{fmtNum(app.dailyInstalls)}</N></span>}
                {app.monthlyInstalls && <span><span className="text-slate-400">Monthly </span><N>{fmtNum(app.monthlyInstalls)}</N></span>}
                {app.revenueEstimate && <span><span className="text-slate-400">Revenue </span><span className="font-semibold text-emerald-700">{fmtRevenue(app.revenueEstimate)}/mo</span></span>}
                {app.asoScore != null && <span><span className="text-slate-400">ASO </span><ASOBadge score={app.asoScore}/></span>}
                {app.version && <span className="text-slate-400">v{app.version}</span>}
                {app.size    && <span className="text-slate-400">{app.size}</span>}
              </div>
            </div>
            <a href={`https://play.google.com/store/apps/details?id=${app.appId}`} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
              <ExternalLink size={15}/>
            </a>
          </div>
          {/* Screenshots */}
          {(app.screenshotUrls?.length > 0 || app.screenshotCount > 0) && (
            <div className="mt-4 screenshots-scroll overflow-x-auto pb-2">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {app.screenshotUrls?.length > 0
                  ? app.screenshotUrls.map((url, i) => (
                      <img key={i} src={url} alt="" className="h-44 w-auto rounded-xl object-cover flex-shrink-0 border border-slate-100"/>
                    ))
                  : Array.from({ length: Math.min(app.screenshotCount, 8) }).map((_, i) => (
                      <div key={i} className="w-24 h-44 bg-slate-200 rounded-xl flex-shrink-0 animate-pulse"/>
                    ))
                }
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.  STATS BAR HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function computeStats(apps) {
  const total   = apps.length;
  const active  = apps.filter(a => a.daysSinceUpdate != null && a.daysSinceUpdate <= 365).length;
  const stale   = apps.filter(a => a.daysSinceUpdate != null && a.daysSinceUpdate  > 365).length;
  const removed = apps.filter(a => a._status === 'removed').length;
  const scored  = apps.filter(a => a.score > 0);
  const avgRating = scored.length ? (scored.reduce((s, a) => s + a.score, 0) / scored.length).toFixed(1) : '—';
  const freeN   = apps.filter(a => a.free !== false).length;
  const iapN    = apps.filter(a => a.offersIAP).length;
  const totalRev = apps.reduce((s, a) => s + (a.revenueEstimate || 0), 0);
  return { total, active, stale, removed, avgRating, freeN, iapN, totalRev };
}
function StatItem({ label, value }) {
  return <div className="flex items-center gap-1.5 flex-shrink-0"><span className="text-slate-500 text-sm">{label}</span><span className="font-semibold text-slate-800 text-sm">{value}</span></div>;
}
function StatDot({ color, label, value }) {
  return <div className="flex items-center gap-1.5 flex-shrink-0"><span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`}/><span className="text-slate-500 text-sm">{label}</span><span className="font-semibold text-slate-800 text-sm">{value}</span></div>;
}
function ScorePill({ label, score, cls }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${cls}`}>{label}: {score}</span>;
}
function FSelect({ label, value, onChange, opts }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

const SUGGESTIONS = ['meditation','fitness tracker','budget planner','photo editor','language learning','habit tracker','sleep sounds','recipe app'];

// ─────────────────────────────────────────────────────────────────────────────
// 9.  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [query,        setQuery]        = useState('');
  const [country,      setCountry]      = useState('us');
  const [fetchCount,   setFetchCount]   = useState(100);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [result,       setResult]       = useState(null);
  const [apps,         setApps]         = useState([]);
  const [filters,      setFilters]      = useState(FILTER_DEFAULTS);
  const [showFilters,  setShowFilters]  = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);
  const [metrics,      setMetrics]      = useState(DEFAULT_METRICS);
  const [sort,         setSort]         = useState({ key: 'minInstalls', dir: 'desc' });
  const [view,         setView]         = useState('table');
  const [checkingRemoved, setCheckingRemoved] = useState(false);
  const [checkProgress,   setCheckProgress]   = useState(null);

  const doSearch = useCallback(async (q = query, c = country, n = fetchCount) => {
    if (!q.trim()) return;
    setLoading(true); setError(''); setResult(null); setApps([]); setCheckProgress(null);
    try {
      const data = await nichesAPI.search(q.trim(), c, n);
      setResult(data);
      setApps((data.apps || []).map(a => ({ ...a, _status: 'unknown' })));
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [query, country, fetchCount]);

  const handleKey  = e => { if (e.key === 'Enter') doSearch(); };
  const handleSort = key => setSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });
  const setFilter  = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const activeCount = countActive(filters);

  const checkRemoved = useCallback(async () => {
    if (checkingRemoved || !apps.length) return;
    setCheckingRemoved(true);
    const ids = apps.map(a => a.appId);
    const BATCH = 25;
    setCheckProgress({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i += BATCH) {
      try {
        const data = await nichesAPI.checkApps(ids.slice(i, i + BATCH), country);
        const map = {};
        (data.results || []).forEach(r => { map[r.appId] = r.status; });
        setApps(prev => prev.map(a => map[a.appId] ? { ...a, _status: map[a.appId] } : a));
      } catch {}
      setCheckProgress({ done: Math.min(i + BATCH, ids.length), total: ids.length });
    }
    setCheckingRemoved(false);
  }, [apps, country, checkingRemoved]);

  const displayed = applySort(applyFilters(apps, filters), sort);
  const stats     = apps.length > 0 ? computeStats(apps) : null;
  const m         = result?.metrics;

  // ── HERO ──────────────────────────────────────────────────────────────────
  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
        <div className="w-full max-w-2xl text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
            <TrendingUp size={24} className="text-white"/>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Market Explorer</h1>
          <p className="text-slate-500 text-lg mb-8">Search any keyword to analyse every app competing in that niche</p>
          <div className="flex gap-2 shadow-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey} autoFocus
                placeholder="e.g. meditation, fitness tracker, budget planner…"
                className="w-full pl-11 pr-4 py-3.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white text-slate-900 placeholder:text-slate-400"/>
            </div>
            <select value={country} onChange={e => setCountry(e.target.value)} className="px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-400">
              {COUNTRIES.map(([c,l]) => <option key={c} value={c}>{l}</option>)}
            </select>
            <select value={fetchCount} onChange={e => setFetchCount(parseInt(e.target.value))} className="px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-400">
              {[25,50,100,150,200,250].map(n => <option key={n} value={n}>{n} apps</option>)}
            </select>
            <button onClick={() => doSearch()} className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all">Search</button>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">{s}</button>
            ))}
          </div>
          <div className="mt-12 grid grid-cols-3 gap-4 text-left">
            {[
              { icon: Package, t: 'Up to 250 apps per search', d: 'Every result Google Play returns for the keyword — not just the top 5.' },
              { icon: SlidersHorizontal, t: 'Pick your columns', d: 'Choose from 60+ metrics. Drag to reorder. Available data shows live.' },
              { icon: Zap, t: 'ASO quality scores', d: 'Spot weak competitors and find the best niche entry point.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Icon size={16} className="text-blue-600 mb-2"/>
                <p className="text-sm font-semibold text-slate-700 mb-1">{t}</p>
                <p className="text-xs text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        <p className="text-sm text-slate-500">Analysing <strong className="text-slate-700">"{query}"</strong> — fetching {fetchCount} apps…</p>
        <p className="text-xs text-slate-400">Enriching top 20 with full detail (screenshots, version, description…)</p>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">

      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 sticky top-0 z-20 shadow-sm flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Search keyword…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white text-slate-900 placeholder:text-slate-400"/>
        </div>
        <select value={country} onChange={e => setCountry(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-400">
          {COUNTRIES.map(([c,l]) => <option key={c} value={c}>{l}</option>)}
        </select>
        {/* Fetch count selector */}
        <select value={fetchCount} onChange={e => setFetchCount(parseInt(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-400"
          title="Number of apps to fetch (max 250 per Google Play search)">
          {[25,50,100,150,200,250].map(n => <option key={n} value={n}>{n} apps</option>)}
        </select>
        <button onClick={() => doSearch()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Search</button>

        <Sep/>

        {/* Column picker */}
        <button onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
          <Settings2 size={14}/> Columns <span className="text-xs text-blue-600 font-semibold">{metrics.length}</span>
        </button>

        {/* View toggle */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 gap-0.5">
          {[['table',Table2,'Table'],['grid',LayoutGrid,'Grid'],['full',AlignJustify,'Full']].map(([v,Icon,l]) => (
            <button key={v} onClick={() => setView(v)} title={l}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                view === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Icon size={13}/>{l}
            </button>
          ))}
        </div>

        <Sep/>

        {/* Filters */}
        <button onClick={() => setShowFilters(v => !v)}
          className={clsx('flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
            showFilters || activeCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}>
          <SlidersHorizontal size={14}/> Filters
          {activeCount > 0 && <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>}
        </button>
        {activeCount > 0 && <button onClick={() => setFilters(FILTER_DEFAULTS)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"><X size={11}/> Clear</button>}

        <Sep/>

        {/* Check removed */}
        <button onClick={checkRemoved} disabled={checkingRemoved}
          className={clsx('flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
            checkingRemoved ? 'bg-orange-50 border-orange-200 text-orange-600 cursor-wait' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600')}>
          {checkingRemoved
            ? <><div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin"/>{checkProgress ? `${checkProgress.done}/${checkProgress.total}` : '…'}</>
            : <><AlertCircle size={13}/>Check Removed</>}
        </button>
      </div>

      {/* ── STATS BAR ── */}
      {stats && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-4 overflow-x-auto market-scroll flex-shrink-0">
          <StatItem label="Total" value={stats.total}/>
          <Sep/>
          <StatDot color="bg-green-500" label="Active" value={stats.active}/>
          <StatDot color="bg-red-400"   label="Stale"  value={stats.stale}/>
          {stats.removed > 0 && <StatDot color="bg-red-600" label="Removed" value={stats.removed}/>}
          <Sep/>
          <StatItem label="Avg Rating" value={<span className="text-amber-600 font-bold">★ {stats.avgRating}</span>}/>
          <StatItem label="Free"       value={stats.freeN}/>
          <StatItem label="With IAP"   value={stats.iapN}/>
          <StatItem label="Est. revenue" value={<span className="text-emerald-700 font-semibold">{fmtRevenue(stats.totalRev)}/mo</span>}/>
          {m && (<><Sep/>
            <ScorePill label="Opportunity" score={m.opportunityScore} cls={m.opportunityScore >= 65 ? 'bg-green-100 text-green-700' : m.opportunityScore >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}/>
            <ScorePill label="Demand"      score={m.demandScore}      cls="bg-blue-100 text-blue-700"/>
            <ScorePill label="Competition" score={m.competitionScore} cls="bg-slate-100 text-slate-700"/>
          </>)}
          <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{displayed.length} / {apps.length} apps shown</span>
        </div>
      )}

      {/* ── FILTER PANEL ── */}
      {showFilters && (
        <div className="bg-white border-b border-slate-200 px-4 py-4 space-y-4 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <FSelect label="Release date"    value={filters.releaseRange}   onChange={v => setFilter('releaseRange',  v)}                       opts={RELEASE_OPTS}/>
            <FSelect label="Last updated"    value={filters.updateRange}    onChange={v => setFilter('updateRange',   v)}                       opts={UPDATE_OPTS}/>
            <FSelect label="Min rating"      value={filters.minRating}      onChange={v => setFilter('minRating',     parseFloat(v))}           opts={[{v:0,l:'Any'},{v:3,l:'3★+'},{v:3.5,l:'3.5★+'},{v:4,l:'4★+'},{v:4.5,l:'4.5★+'}]}/>
            <FSelect label="Min installs"    value={filters.minInstalls}    onChange={v => setFilter('minInstalls',   parseInt(v))}             opts={INSTALL_OPTS}/>
            <FSelect label="Price"           value={filters.priceType}      onChange={v => setFilter('priceType',     v)}                       opts={[{v:'all',l:'All'},{v:'free',l:'Free only'},{v:'paid',l:'Paid only'}]}/>
            <FSelect label="Content rating"  value={filters.contentRating}  onChange={v => setFilter('contentRating', v)}                       opts={CONTENT_OPTS}/>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Daily installs range */}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Daily installs</span>
            <select value={filters.dailyMin} onChange={e => setFilter('dailyMin', parseInt(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
              {DAILY_MIN_O.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <span className="text-slate-400 text-sm">—</span>
            <select value={filters.dailyMax} onChange={e => setFilter('dailyMax', parseInt(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
              {DAILY_MAX_O.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>

            <Sep/>

            {/* Status filter */}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Status</span>
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 gap-0.5">
              {[['all','All'],['live','Live only'],['removed','Removed only']].map(([v,l]) => (
                <button key={v} onClick={() => setFilter('status', v)}
                  className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    filters.status === v ? (v === 'removed' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-blue-700 shadow-sm') : 'text-slate-500 hover:text-slate-700')}>{l}</button>
              ))}
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-4 ml-auto flex-wrap">
              {[{k:'hasIAP',l:'Has IAP'},{k:'hasAds',l:'Has Ads'},{k:'hasVideo',l:'Has Video'},{k:'editorsChoice',l:"Editor's Choice"}].map(({k,l}) => (
                <label key={k} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" checked={filters[k]} onChange={e => setFilter(k, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                  {l}
                </label>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Min screens</span>
                <select value={filters.minScreenshots} onChange={e => setFilter('minScreenshots', parseInt(e.target.value))}
                  className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400">
                  {[0,1,3,5,8].map(v => <option key={v} value={v}>{v === 0 ? 'Any' : `${v}+`}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEWS ── */}
      {view === 'table' && <TableView apps={displayed} metrics={metrics} sort={sort} onSort={handleSort}/>}
      {view === 'grid'  && <GridView  apps={displayed}/>}
      {view === 'full'  && <FullView  apps={displayed}/>}

      {/* ── METRICS PICKER MODAL ── */}
      {showPicker && (
        <MetricsPicker
          selected={metrics}
          onApply={m => { setMetrics(m); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
