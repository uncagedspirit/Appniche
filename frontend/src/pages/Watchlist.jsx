import { useState, useEffect, useCallback } from 'react';
import { appsAPI } from '../lib/api.js';
import { dbOps } from '../lib/db.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { PageHeader, CountrySelect } from '../components/UI.jsx';
import {
  Eye, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Minus, Star, AlertCircle, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function Delta({ prev, curr, format = v => v }) {
  if (prev == null || curr == null) return <span className="text-slate-400 text-xs">—</span>;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.01) return <span className="text-slate-400 text-xs">±0</span>;
  const up = diff > 0;
  return (
    <span className={clsx('flex items-center gap-0.5 text-xs font-semibold', up ? 'text-emerald-600' : 'text-red-500')}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{format(diff)}
    </span>
  );
}

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function Watchlist() {
  const { country, setCountry } = useSettings();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('android');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [refreshing, setRefreshing] = useState(new Set());

  const loadItems = useCallback(async () => {
    const list = await dbOps.getWatchlist(null);
    setItems(list);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await appsAPI.search(query.trim(), platform, country, 8);
      setSearchResults(results || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (app) => {
    const snapshot = {
      score: app.score,
      reviews: app.reviews,
      installs: app.installs,
      checkedAt: new Date().toISOString(),
    };
    await dbOps.addToWatchlist(null, {
      appId: app.appId,
      title: app.title,
      developer: app.developer,
      icon: app.icon,
      platform,
      country,
      snapshot,
    });
    setSearchResults([]);
    setQuery('');
    toast.success(`"${app.title}" added to watchlist`);
    loadItems();
  };

  const handleRemove = async (item) => {
    await dbOps.removeFromWatchlist(null, item.appId, item.platform);
    toast.success('Removed from watchlist');
    loadItems();
  };

  const handleRefreshOne = async (item) => {
    setRefreshing(prev => new Set([...prev, item.id]));
    try {
      const fresh = await appsAPI.detail(item.appId, item.platform, item.country || country);
      const snapshot = {
        score: fresh.score,
        reviews: fresh.reviews,
        installs: fresh.installs,
        checkedAt: new Date().toISOString(),
      };
      await dbOps.updateWatchlistSnapshot(null, item.appId, item.platform, snapshot);
      toast.success(`${item.title} refreshed`);
      loadItems();
    } catch (e) {
      toast.error(`Failed to refresh ${item.title}`);
    } finally {
      setRefreshing(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  const handleRefreshAll = async () => {
    if (!items.length) return;
    toast('Refreshing all…', { icon: '🔄' });
    await Promise.allSettled(items.map(handleRefreshOne));
  };

  const isWatched = (appId, plt) => items.some(x => x.appId === appId && x.platform === plt);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Competitor Watchlist"
        subtitle="Track competitor apps and see how their ratings, reviews, and installs change over time"
      />

      {/* Add app bar */}
      <div className="card mb-6">
        <p className="section-label mb-3">Add a Competitor</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by app name…"
              className="input"
            />
          </div>
          <div>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="input">
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </div>
          <CountrySelect value={country} onChange={setCountry} />
          <button onClick={handleSearch} disabled={searching || !query.trim()} className="btn-primary">
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(app => {
              const watched = isWatched(app.appId, platform);
              return (
                <div key={app.appId} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  {app.icon && <img src={app.icon} className="w-9 h-9 rounded-xl flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{app.title}</p>
                    <p className="text-xs text-slate-400">{app.developer} · {app.score}★</p>
                  </div>
                  <button
                    onClick={() => !watched && handleAdd(app)}
                    disabled={watched}
                    className={clsx('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                      watched ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'
                    )}
                  >
                    {watched ? <CheckCircle size={12} /> : <Plus size={12} />}
                    {watched ? 'Watching' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Watchlist */}
      {items.length === 0 ? (
        <div className="card text-center py-16">
          <Eye size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No apps on your watchlist yet</p>
          <p className="text-slate-400 text-sm mt-1">Search for a competitor above to start tracking</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">{items.length} apps tracked</p>
            <button onClick={handleRefreshAll} className="btn-secondary flex items-center gap-1.5 text-xs">
              <RefreshCw size={12} /> Refresh All
            </button>
          </div>
          <div className="space-y-3">
            {items.map(item => {
              const snap = item.snapshot;
              const isRefreshing = refreshing.has(item.id);
              return (
                <div key={item.id} className="card">
                  <div className="flex items-center gap-4">
                    {item.icon && <img src={item.icon} className="w-12 h-12 rounded-xl flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                          {item.platform}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.developer}</p>
                    </div>

                    {/* Live stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">Rating</p>
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                          <Star size={11} className="text-amber-400" />{snap?.score ?? '—'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">Reviews</p>
                        <p className="font-bold text-slate-800 text-sm">{fmtNum(snap?.reviews)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">Installs</p>
                        <p className="font-bold text-slate-800 text-sm">{snap?.installs || '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">Last Check</p>
                        <p className="text-xs text-slate-500">
                          {item.lastChecked
                            ? new Date(item.lastChecked).toLocaleDateString()
                            : new Date(item.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleRefreshOne(item)}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => handleRemove(item)}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {item.lastChecked && snap && item.addedAt !== item.lastChecked && (
                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-4 text-xs text-slate-500">
                      <AlertCircle size={12} className="text-blue-400 flex-shrink-0" />
                      <span>Tracking since {new Date(item.addedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
