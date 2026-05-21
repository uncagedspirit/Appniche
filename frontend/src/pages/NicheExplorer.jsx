import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nichesAPI } from '../lib/api.js';
import { PageHeader, CountrySelect, LoadingState, ErrorState, ScoreRing, Stars, TabBar, AppCard } from '../components/UI.jsx';
import { Compass, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export default function NicheExplorer() {
  const [searchParams] = useSearchParams();
  const [country, setCountry] = useState('us');
  const [categories, setCategories] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selected, setSelected] = useState(searchParams.get('cat') || null);
  const [nicheData, setNicheData] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [loadingNiche, setLoadingNiche] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('top_free');

  useEffect(() => {
    nichesAPI.categories().then(setCategories).catch(() => {});
    loadOpportunities();
  }, [country]);

  useEffect(() => {
    if (searchParams.get('cat')) handleSelectCategory(searchParams.get('cat'));
  }, []);

  const loadOpportunities = async () => {
    setLoadingOpp(true);
    try {
      const data = await nichesAPI.opportunities(country);
      setOpportunities(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoadingOpp(false); }
  };

  const handleSelectCategory = async (cat) => {
    setSelected(cat);
    setNicheData(null);
    setLoadingNiche(true);
    setError(null);
    try {
      const data = await nichesAPI.analyze(cat, country);
      setNicheData(data);
      setTab('top_free');
    } catch (e) { setError(e.message); }
    finally { setLoadingNiche(false); }
  };

  const tabs = nicheData ? [
    { id: 'top_free', label: 'Top Free', count: nicheData.topFree?.length },
    { id: 'top_paid', label: 'Top Paid', count: nicheData.topPaid?.length },
    { id: 'top_grossing', label: 'Top Grossing', count: nicheData.topGrossing?.length },
  ] : [];

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Niche Explorer"
        subtitle="Find underserved categories with the highest opportunity scores"
        action={<CountrySelect value={country} onChange={setCountry} />}
      />

      <div className="flex gap-6">
        {/* Left: Category list */}
        <div className="w-52 flex-shrink-0">
          <p className="section-label mb-3">Categories</p>
          <div className="space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
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

        {/* Right: Content */}
        <div className="flex-1">
          {/* Opportunities overview */}
          {!selected && (
            <div>
              <p className="section-label mb-4 flex items-center gap-2">
                <TrendingUp size={12} /> Opportunity Ranking
              </p>
              {loadingOpp ? <LoadingState message="Scanning all categories..." /> :
               error ? <ErrorState message={error} onRetry={loadOpportunities} /> : (
                <div className="grid grid-cols-2 gap-3">
                  {opportunities.map((opp, i) => (
                    <button
                      key={opp.category}
                      onClick={() => handleSelectCategory(opp.category)}
                      className="card text-left hover:border-ink-500 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-ink-100">{opp.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-ink-500">Avg <span className="text-yellow-400">{opp.avgRating}★</span></span>
                            <span className="text-xs text-ink-500">{opp.lowRatedCount} weak apps</span>
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

          {/* Selected niche detail */}
          {selected && (
            <div>
              {loadingNiche ? <LoadingState message={`Analyzing ${selected}...`} /> :
               error ? <ErrorState message={error} /> :
               nicheData && (
                <div>
                  {/* Header stats */}
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

                  <TabBar tabs={tabs} active={tab} onChange={setTab} />

                  <div className="grid grid-cols-2 gap-3">
                    {(tab === 'top_free' ? nicheData.topFree :
                      tab === 'top_paid' ? nicheData.topPaid :
                      nicheData.topGrossing
                    ).map(app => (
                      <AppCard key={app.appId} app={app} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
