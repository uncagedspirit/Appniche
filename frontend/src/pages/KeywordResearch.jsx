import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { keywordsAPI, appsAPI } from '../lib/api.js';
import { dbOps } from '../lib/db.js';
import { PageHeader, CountrySelect, LoadingState, ErrorState, KeywordBadge, AppCard, TabBar, SkeletonCard } from '../components/UI.jsx';
import { Search, Download, Save, ChevronRight, AlertCircle, TrendingUp, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function KeywordResearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('us');
  const [tab, setTab] = useState('suggestions');
  const [loading, setLoading] = useState(false);
  const [expandLoading, setExpandLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [error, setError] = useState(null);

  const [suggestions, setSuggestions] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [difficulty, setDifficulty] = useState([]);
  const [topApps, setTopApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setSuggestions(null);
    try {
      const data = await keywordsAPI.suggest(query.trim(), country);
      setSuggestions(data);
      setTab('suggestions');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async () => {
    if (!query.trim()) return;
    setExpandLoading(true); setError(null);
    try {
      const data = await keywordsAPI.expand(query.trim(), country);
      setExpanded(data);
      setTab('expanded');
    } catch (e) {
      setError(e.message);
    } finally {
      setExpandLoading(false);
    }
  };

  const handleDifficulty = async () => {
    const kws = (suggestions?.combined || []).slice(0, 15);
    if (!kws.length) return;
    setDiffLoading(true);
    try {
      const data = await keywordsAPI.difficulty(kws, country);
      setDifficulty(data);
      setTab('difficulty');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleKeywordClick = async (kw) => {
    setSelectedKeyword(kw);
    setAppsLoading(true);
    try {
      const apps = await appsAPI.search(kw, 'android', country, 10);
      setTopApps(apps);
    } catch {} finally {
      setAppsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!suggestions || !user) return;
    try {
      await dbOps.saveSearch(user.uid, {
        type: 'keyword',
        query,
        country,
        keywords: suggestions.combined,
        total: suggestions.combined?.length
      });
      toast.success('Search saved!');
    } catch { toast.error('Failed to save'); }
  };

  const exportCSV = () => {
    const kws = tab === 'expanded' ? expanded?.keywords : suggestions?.combined;
    if (!kws?.length) return;
    const csv = 'keyword\n' + kws.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `keywords_${query}.csv`;
    a.click();
  };

  const tabs = [
    { id: 'suggestions', label: 'Suggestions', count: suggestions?.combined?.length },
    { id: 'expanded', label: 'Full Expansion', count: expanded?.total },
    { id: 'difficulty', label: 'Difficulty', count: difficulty?.length },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Keyword Research"
        subtitle="Discover keywords people search for on Play Store and App Store"
        action={
          <div className="flex gap-2">
            {suggestions && (
              <>
                <button onClick={handleSave} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Save size={13} /> Save
                </button>
                <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Download size={13} /> Export
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter a niche or seed keyword (e.g. habit tracker, fitness, budget)"
            className="input pl-10"
          />
        </div>
        <CountrySelect value={country} onChange={setCountry} />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button type="button" onClick={handleExpand} className="btn-secondary flex items-center gap-1.5" disabled={expandLoading || !query.trim()}>
          <Layers size={13} />
          {expandLoading ? 'Expanding...' : 'Full A-Z Expand'}
        </button>
      </form>

      {error && <ErrorState message={error} onRetry={handleSearch} />}

      {suggestions && (
        <div className="flex gap-6">
          {/* Left: Keywords */}
          <div className="flex-1">
            <TabBar tabs={tabs} active={tab} onChange={setTab} />

            {tab === 'suggestions' && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="card">
                    <p className="section-label mb-2">Play Store</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.play?.length ? suggestions.play.map(k => (
                        <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                      )) : <p className="text-xs text-ink-500">No suggestions</p>}
                    </div>
                  </div>
                  <div className="card">
                    <p className="section-label mb-2">App Store</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.apple?.length ? suggestions.apple.map(k => (
                        <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                      )) : <p className="text-xs text-ink-500">No suggestions</p>}
                    </div>
                  </div>
                </div>
                <div className="card">
                  <p className="section-label mb-3">All Combined ({suggestions.combined?.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.combined?.map(k => (
                      <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                    ))}
                  </div>
                  {suggestions && (
                    <button onClick={handleDifficulty} className="mt-4 btn-secondary flex items-center gap-1.5 text-xs" disabled={diffLoading}>
                      <TrendingUp size={12} />
                      {diffLoading ? 'Analyzing difficulty...' : 'Analyze Difficulty'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'expanded' && (
              <div className="card">
                {expandLoading ? <LoadingState message="Running A-Z expansion across both stores..." /> : expanded ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-ink-200">{expanded.total} keywords found</p>
                      <button onClick={exportCSV} className="btn-ghost text-xs flex items-center gap-1">
                        <Download size={11} /> Export CSV
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                      {expanded.keywords?.map(k => (
                        <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ink-500">Click "Full A-Z Expand" above to get 100+ keywords.</p>
                )}
              </div>
            )}

            {tab === 'difficulty' && (
              <div>
                {diffLoading ? <LoadingState message="Checking competition for each keyword..." /> : difficulty.length > 0 ? (
                  <div className="space-y-2">
                    {difficulty.sort((a,b) => a.difficulty - b.difficulty).map(kw => (
                      <div key={kw.keyword} className="card flex items-center gap-4 cursor-pointer hover:border-ink-500 transition-all" onClick={() => handleKeywordClick(kw.keyword)}>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-ink-100">{kw.keyword}</p>
                          <p className="text-xs text-ink-500">{kw.competition} results · avg {kw.avgRating}★ · avg {kw.avgReviews?.toLocaleString()} reviews</p>
                        </div>
                        <div className={clsx(
                          'text-sm font-mono font-medium px-3 py-1 rounded-lg',
                          kw.difficulty < 40 ? 'bg-green-500/10 text-green-400' :
                          kw.difficulty < 70 ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'
                        )}>
                          {kw.difficulty < 40 ? 'Easy' : kw.difficulty < 70 ? 'Medium' : 'Hard'}
                          <span className="ml-2 text-xs opacity-60">{kw.difficulty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">Select "Suggestions" tab first, then click "Analyze Difficulty".</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Apps for selected keyword */}
          {selectedKeyword && (
            <div className="w-72 flex-shrink-0">
              <div className="card sticky top-4">
                <p className="section-label mb-1">Top apps for</p>
                <p className="text-sm font-medium text-ink-100 mb-4">"{selectedKeyword}"</p>
                {appsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topApps.map(app => (
                      <AppCard key={app.appId} app={app} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!suggestions && !loading && !error && (
        <div className="text-center py-20">
          <Search size={32} className="text-ink-700 mx-auto mb-4" />
          <p className="text-ink-400">Enter a niche to discover keywords</p>
          <p className="text-xs text-ink-600 mt-1">Try: "meditation", "finance tracker", "language learning"</p>
        </div>
      )}
    </div>
  );
}
