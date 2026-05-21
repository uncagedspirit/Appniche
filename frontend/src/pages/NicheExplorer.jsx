import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nichesAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { PageHeader, CountrySelect, LoadingState, ErrorState, ScoreRing, TabBar, AppCard, EmptyState } from '../components/UI.jsx';
import { TrendingUp, Search, Zap } from 'lucide-react';
import clsx from 'clsx';

function MetricBar({ label, value, invert = false }) {
  const good = invert ? value < 45 : value >= 70;
  const mid = invert ? value < 70 : value >= 45;
  const barColor = good ? 'bg-green-400' : mid ? 'bg-yellow-400' : 'bg-red-400';
  const textColor = good ? 'text-green-400' : mid ? 'text-yellow-400' : 'text-red-400';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-500">{label}</span>
        <span className={clsx('text-xs font-mono font-700', textColor)}>{value}</span>
      </div>
      <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function NicheExplorer() {
  const [searchParams] = useSearchParams();
  const { country, setCountry } = useSettings();
  const [mode, setMode] = useState('finder');

  // Niche Finder state
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Category Browser state
  const [categories, setCategories] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [nicheData, setNicheData] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [loadingNiche, setLoadingNiche] = useState(false);
  const [browseError, setBrowseError] = useState(null);
  const [tab, setTab] = useState('top_free');

  useEffect(() => {
    nichesAPI.categories().then(setCategories).catch(() => {});
    loadOpportunities();
    const cat = searchParams.get('cat');
    if (cat) {
      setMode('browse');
      handleSelectCategory(cat);
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOpportunities = async () => {
    setLoadingOpp(true);
    try {
      const data = await nichesAPI.opportunities(country);
      setOpportunities(data || []);
    } catch (e) { setBrowseError(e.message); }
    finally { setLoadingOpp(false); }
  };

  const handleSelectCategory = async (cat) => {
    setSelected(cat);
    setNicheData(null);
    setLoadingNiche(true);
    setBrowseError(null);
    try {
      const data = await nichesAPI.analyze(cat, country);
      setNicheData(data);
      setTab('top_free');
    } catch (e) { setBrowseError(e.message); }
    finally { setLoadingNiche(false); }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearchResult(null);
    setSearchError(null);
    setLoadingSearch(true);
    try {
      const data = await nichesAPI.search(query.trim(), country);
      setSearchResult(data);
    } catch (e) { setSearchError(e.message); }
    finally { setLoadingSearch(false); }
  };

  const browseTabs = nicheData ? [
    { id: 'top_free', label: 'Top Free', count: nicheData.topFree?.length },
    { id: 'top_paid', label: 'Top Paid', count: nicheData.topPaid?.length },
    { id: 'top_grossing', label: 'Top Grossing', count: nicheData.topGrossing?.length },
  ] : [];

  const verdictStyle = (v) =>
    v === 'High Opportunity'     ? 'text-green-400 bg-green-400/10 border-green-400/25' :
    v === 'Moderate Opportunity' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' :
                                   'text-red-400 bg-red-400/10 border-red-400/25';

  const suggestions = ['meditation', 'habit tracker', 'budget planner', 'language learning', 'sleep sounds'];

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Niche Explorer"
        subtitle="Find underserved app niches with the highest opportunity"
        action={<CountrySelect value={country} onChange={setCountry} />}
      />

      {/* Mode toggle */}
      <div className="flex bg-ink-800 border border-ink-700 rounded-lg p-0.5 w-fit mb-6">
        {[
          { id: 'finder', label: '⚡ Niche Finder' },
          { id: 'browse', label: '📂 Category Browser' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              mode === m.id ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── NICHE FINDER ── */}
      {mode === 'finder' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-2 mb-3 max-w-xl">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='e.g. "meditation", "habit tracker", "budget planner"'
                className="input pl-9 w-full"
              />
            </div>
            <button type="submit" className="btn-primary px-5" disabled={!query.trim() || loadingSearch}>
              Analyze
            </button>
          </form>

          {/* Quick suggestions */}
          {!searchResult && !loadingSearch && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-xs text-ink-600">Try:</span>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-ink-700 text-ink-400 hover:text-ink-200 hover:border-ink-500 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {loadingSearch && <LoadingState message={`Scanning niche for "${query}"…`} />}
          {searchError && <ErrorState message={searchError} onRetry={handleSearch} />}

          {!searchResult && !loadingSearch && !searchError && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-acid/10 flex items-center justify-center">
                <Zap size={24} className="text-acid" />
              </div>
              <div>
                <p className="text-ink-200 font-medium">Find your niche</p>
                <p className="text-sm text-ink-500 mt-1 max-w-sm">
                  Enter any keyword to get Demand, Competition and Opportunity scores — exactly like AppStoreSpy's Niche Finder.
                </p>
              </div>
            </div>
          )}

          {searchResult && !loadingSearch && (
            <div>
              {/* Metrics card */}
              {searchResult.metrics && (
                <div className="card mb-5 p-5">
                  <div className="flex items-start gap-6">
                    {/* Big score ring */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                      <ScoreRing score={searchResult.metrics.opportunityScore} size="lg" />
                      <span className="text-xs text-ink-500">Opportunity</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title + verdict */}
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <h2 className="font-display text-lg font-700 text-ink-50">
                          "{searchResult.query}"
                        </h2>
                        <span className={clsx('text-xs px-2.5 py-1 rounded-full border font-medium', verdictStyle(searchResult.metrics.verdict))}>
                          {searchResult.metrics.verdict}
                        </span>
                      </div>

                      {/* Demand / Competition bars */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5">
                        <MetricBar label="Demand" value={searchResult.metrics.demandScore} />
                        <MetricBar label="Competition" value={searchResult.metrics.competitionScore} invert />
                      </div>

                      {/* Quick stats row */}
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="text-center">
                          <p className="font-display text-lg font-700 text-yellow-400">{searchResult.metrics.avgRating}★</p>
                          <p className="text-xs text-ink-500">Avg Rating</p>
                        </div>
                        <div className="w-px h-8 bg-ink-700" />
                        <div className="text-center">
                          <p className="font-display text-lg font-700 text-ink-100">{searchResult.totalFound}</p>
                          <p className="text-xs text-ink-500">Apps Found</p>
                        </div>
                        <div className="w-px h-8 bg-ink-700" />
                        <div className="text-center">
                          <p className="font-display text-lg font-700 text-red-400">{searchResult.metrics.weakAppsCount}</p>
                          <p className="text-xs text-ink-500">Weak Apps (&lt;4★)</p>
                        </div>
                        <div className="w-px h-8 bg-ink-700" />
                        <div className="text-center">
                          <p className="font-display text-lg font-700 text-green-400">{searchResult.metrics.strongAppsCount}</p>
                          <p className="text-xs text-ink-500">Strong Incumbents</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* App grid */}
              {searchResult.apps?.length > 0 ? (
                <div>
                  <p className="section-label mb-3">Top apps in this niche</p>
                  <div className="grid grid-cols-2 gap-3">
                    {searchResult.apps.map(app => (
                      <AppCard key={app.appId} app={app} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title="No apps found" subtitle="Try a different keyword" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORY BROWSER ── */}
      {mode === 'browse' && (
        <div className="flex gap-6">
          {/* Left: category list */}
          <div className="w-52 flex-shrink-0">
            <p className="section-label mb-3">Categories</p>
            <div className="space-y-0.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {categories.map(cat => {
                const opp = opportunities.find(o => o.category === cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between',
                      selected === cat.id
                        ? 'bg-acid/15 text-acid'
                        : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800'
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    {opp && (
                      <span className={clsx(
                        'text-xs font-mono ml-1 flex-shrink-0',
                        opp.opportunityScore >= 70 ? 'text-green-400' :
                        opp.opportunityScore >= 50 ? 'text-yellow-400' : 'text-ink-500'
                      )}>{opp.opportunityScore}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: content */}
          <div className="flex-1">
            {!selected && (
              <div>
                <p className="section-label mb-4 flex items-center gap-2">
                  <TrendingUp size={12} /> Opportunity Ranking
                </p>
                {loadingOpp ? <LoadingState message="Scanning all categories…" /> :
                 browseError ? <ErrorState message={browseError} onRetry={loadOpportunities} /> : (
                  <div className="grid grid-cols-2 gap-3">
                    {opportunities.map(opp => (
                      <button
                        key={opp.category}
                        onClick={() => handleSelectCategory(opp.category)}
                        className="card text-left hover:border-ink-500 transition-all"
                      >
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
              <div>
                {loadingNiche ? <LoadingState message={`Analyzing ${selected}…`} /> :
                 browseError ? <ErrorState message={browseError} /> :
                 nicheData && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="font-display text-xl font-700 text-ink-50">{nicheData.categoryName}</h2>
                        <p className="text-sm text-ink-400 mt-0.5">
                          Avg rating {nicheData.stats.free.avgRating}★ · {nicheData.stats.free.lowRatedCount} weak apps
                        </p>
                      </div>
                      <ScoreRing score={nicheData.opportunityScore} size="md" label="Opportunity" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="card text-center">
                        <p className="font-display text-xl font-700 text-ink-50">{nicheData.topFree?.length}</p>
                        <p className="text-xs text-ink-500 mt-1">Top Free Apps</p>
                      </div>
                      <div className="card text-center">
                        <p className="font-display text-xl font-700 text-yellow-400">{nicheData.stats.free.avgRating}</p>
                        <p className="text-xs text-ink-500 mt-1">Avg Rating</p>
                      </div>
                      <div className="card text-center">
                        <p className="font-display text-xl font-700 text-red-400">{nicheData.stats.free.lowRatedCount}</p>
                        <p className="text-xs text-ink-500 mt-1">Apps Below 4★</p>
                      </div>
                    </div>

                    <TabBar tabs={browseTabs} active={tab} onChange={setTab} />

                    <div className="grid grid-cols-2 gap-3">
                      {(tab === 'top_free' ? nicheData.topFree :
                        tab === 'top_paid' ? nicheData.topPaid :
                        nicheData.topGrossing
                      )?.map(app => (
                        <AppCard key={app.appId} app={app} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
