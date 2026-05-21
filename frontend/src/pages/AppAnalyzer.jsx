import { useState } from 'react';
import { appsAPI, analysisAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { dbOps } from '../lib/db.js';
import { PageHeader, PlatformToggle, CountrySelect, LoadingState, ErrorState, Stars, TabBar, AppCard, ScoreRing } from '../components/UI.jsx';
import { Search, Plus, Trash2, Zap, Save, Users, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AppAnalyzer() {
  const { country, setCountry } = useSettings();
  const [searchQ, setSearchQ] = useState('');
  const [platform, setPlatform] = useState('android');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetail, setAppDetail] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [comparedApps, setComparedApps] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingGap, setLoadingGap] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [tab, setTab] = useState('overview');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const results = await appsAPI.search(searchQ, platform, country, 15);
      setSearchResults(results);
    } catch (e) { toast.error(e.message); }
    finally { setSearching(false); }
  };

  const handleSelectApp = async (app) => {
    setSelectedApp(app);
    setAppDetail(null); setReviews([]); setSimilar([]); setGapAnalysis(null);
    setLoadingDetail(true); setTab('overview');
    try {
      const [detail, revs, sim] = await Promise.all([
        appsAPI.detail(app.appId, platform, country),
        appsAPI.reviews(app.appId, platform, 80, 'newest'),
        appsAPI.similar(app.appId, platform, country)
      ]);
      setAppDetail(detail);
      setReviews(revs);
      setSimilar(sim);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingDetail(false); }
  };

  const handleGapAnalysis = async () => {
    if (!selectedApp) return;
    setLoadingGap(true);
    try {
      const data = await analysisAPI.gaps(selectedApp.appId, platform, appDetail?.genre, country);
      setGapAnalysis(data);
      setTab('gaps');
      // Save to DB
      await dbOps.saveAnalysis(null, {
        appId: selectedApp.appId,
        appTitle: appDetail?.title || selectedApp.title,
        platform,
        ...data
      });
    } catch (e) { toast.error(e.message); }
    finally { setLoadingGap(false); }
  };

  const handleAddToMatrix = (app) => {
    if (comparedApps.find(a => a.appId === app.appId)) return;
    if (comparedApps.length >= 8) { toast.error('Max 8 apps'); return; }
    setComparedApps(prev => [...prev, app]);
  };

  const handleMatrix = async () => {
    if (comparedApps.length < 2) { toast.error('Add at least 2 apps to compare'); return; }
    setLoadingMatrix(true);
    try {
      const data = await analysisAPI.competitorMatrix(comparedApps.map(a => a.appId), platform, country);
      setMatrix(data);
      setTab('matrix');
    } catch (e) { toast.error(e.message); }
    finally { setLoadingMatrix(false); }
  };

  const handleTrack = async (app) => {
    try {
      await dbOps.trackApp(null, { appId: app.appId, title: app.title, icon: app.icon, platform, score: app.score });
      toast.success('App tracked!');
    } catch { toast.error('Failed to track'); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'similar', label: 'Similar Apps', count: similar.length },
    { id: 'gaps', label: 'Gap Analysis' },
    { id: 'matrix', label: 'Competitor Matrix' },
  ];

  const sentimentColor = (s) => s === 'positive' ? 'text-green-400' : s === 'negative' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="App Analyzer" subtitle="Deep dive into any app — reviews, gaps, competitors" />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search for an app by name..." className="input pl-10" />
        </div>
        <PlatformToggle value={platform} onChange={setPlatform} />
        <CountrySelect value={country} onChange={setCountry} />
        <button type="submit" className="btn-primary" disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
      </form>

      <div className="flex gap-6">
        {/* Left: Search results */}
        {searchResults.length > 0 && (
          <div className="w-72 flex-shrink-0">
            <p className="section-label mb-3">Results ({searchResults.length})</p>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {searchResults.map(app => (
                <div key={app.appId} className="relative group">
                  <AppCard
                    app={app}
                    onClick={handleSelectApp}
                    selected={selectedApp?.appId === app.appId}
                  />
                  <button
                    onClick={() => handleAddToMatrix(app)}
                    title="Add to comparison"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 bg-ink-700 hover:bg-acid hover:text-ink-900 rounded-full flex items-center justify-center transition-all"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              ))}
            </div>

            {/* Comparison tray */}
            {comparedApps.length > 0 && (
              <div className="mt-4 card">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Comparing ({comparedApps.length})</p>
                  <button onClick={handleMatrix} className="btn-primary text-xs py-1" disabled={loadingMatrix || comparedApps.length < 2}>
                    {loadingMatrix ? '...' : 'Run Matrix'}
                  </button>
                </div>
                <div className="space-y-1">
                  {comparedApps.map(app => (
                    <div key={app.appId} className="flex items-center gap-2">
                      <img src={app.icon} className="w-6 h-6 rounded" alt="" />
                      <span className="text-xs text-ink-300 flex-1 truncate">{app.title}</span>
                      <button onClick={() => setComparedApps(p => p.filter(a => a.appId !== app.appId))}>
                        <Trash2 size={10} className="text-ink-600 hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: App detail */}
        {selectedApp && (
          <div className="flex-1">
            {loadingDetail ? <LoadingState message="Loading app details..." /> : appDetail && (
              <>
                {/* App header */}
                <div className="card mb-4">
                  <div className="flex items-start gap-4">
                    <img src={appDetail.icon} className="w-16 h-16 rounded-2xl" alt={appDetail.title} />
                    <div className="flex-1">
                      <h2 className="font-display text-lg font-700 text-ink-50">{appDetail.title}</h2>
                      <p className="text-sm text-ink-400">{appDetail.developer}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Stars score={appDetail.score} />
                        <span className="text-xs text-ink-500">{appDetail.reviews?.toLocaleString()} reviews</span>
                        {appDetail.installs && <span className="text-xs text-ink-500">{appDetail.installs}</span>}
                        <span className="badge-blue">{appDetail.genre}</span>
                        {appDetail.free ? <span className="badge-green">Free</span> : <span className="badge-yellow">${appDetail.price}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTrack(appDetail)} className="btn-secondary text-xs">Track</button>
                      <button onClick={handleGapAnalysis} className="btn-primary text-xs flex items-center gap-1" disabled={loadingGap}>
                        <Zap size={12} />
                        {loadingGap ? 'Analyzing...' : 'Gap Analysis'}
                      </button>
                    </div>
                  </div>
                </div>

                <TabBar tabs={tabs} active={tab} onChange={setTab} />

                {tab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="card text-center">
                        <p className="font-display text-xl font-700 text-yellow-400">{appDetail.score?.toFixed(1)}</p>
                        <p className="text-xs text-ink-500">Rating</p>
                      </div>
                      <div className="card text-center">
                        <p className="font-display text-xl font-700 text-ink-50">{appDetail.reviews?.toLocaleString()}</p>
                        <p className="text-xs text-ink-500">Reviews</p>
                      </div>
                      <div className="card text-center">
                        <p className="font-display text-xl font-700 text-ink-50">{appDetail.minInstalls?.toLocaleString() || 'N/A'}</p>
                        <p className="text-xs text-ink-500">Min Installs</p>
                      </div>
                    </div>
                    <div className="card">
                      <p className="section-label mb-2">Details</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {[
                          ['Version', appDetail.version],
                          ['Updated', appDetail.updated],
                          ['Released', appDetail.released],
                          ['Size', appDetail.size],
                          ['Content Rating', appDetail.contentRating],
                          ['Android Version', appDetail.androidVersion],
                        ].map(([k, v]) => v ? (
                          <div key={k} className="flex items-center justify-between py-1 border-b border-ink-800">
                            <span className="text-ink-500">{k}</span>
                            <span className="text-ink-200">{v}</span>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                    {appDetail.histogram && (
                      <div className="card">
                        <p className="section-label mb-3">Rating Distribution</p>
                        <div className="space-y-2">
                          {[5,4,3,2,1].map(star => {
                            const count = appDetail.histogram[star] || 0;
                            const total = Object.values(appDetail.histogram).reduce((a,b) => a+b, 0);
                            const pct = total ? Math.round((count/total)*100) : 0;
                            return (
                              <div key={star} className="flex items-center gap-3">
                                <span className="text-xs text-ink-400 w-4">{star}★</span>
                                <div className="flex-1 bg-ink-700 rounded-full h-2">
                                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-ink-500 w-8">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {appDetail.recentChanges && (
                      <div className="card">
                        <p className="section-label mb-2">Latest Changes</p>
                        <p className="text-sm text-ink-300">{appDetail.recentChanges}</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'reviews' && (
                  <div className="space-y-3">
                    {reviews.slice(0, 30).map(r => (
                      <div key={r.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-medium text-ink-200">{r.userName}</p>
                            <p className="text-xs text-ink-500">{new Date(r.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex">
                            {[1,2,3,4,5].map(i => (
                              <span key={i} style={{fontSize:'10px'}} className={i <= r.score ? 'text-yellow-400' : 'text-ink-700'}>★</span>
                            ))}
                          </div>
                        </div>
                        {r.title && <p className="text-sm font-medium text-ink-100 mb-1">{r.title}</p>}
                        <p className="text-sm text-ink-400">{r.text}</p>
                        {r.replyText && (
                          <div className="mt-2 pl-3 border-l-2 border-ink-700">
                            <p className="text-xs text-ink-500 font-medium mb-0.5">Developer reply</p>
                            <p className="text-xs text-ink-400">{r.replyText}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'similar' && (
                  <div className="grid grid-cols-2 gap-3">
                    {similar.map(app => (
                      <AppCard key={app.appId} app={app} onClick={handleSelectApp} />
                    ))}
                  </div>
                )}

                {tab === 'gaps' && (
                  <div>
                    {loadingGap ? <LoadingState message="Claude is reading 150 reviews and finding gaps..." /> :
                     gapAnalysis ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="card text-center">
                            <p className={clsx('font-display text-lg font-700', sentimentColor(gapAnalysis.overallSentiment))}>
                              {gapAnalysis.overallSentiment}
                            </p>
                            <p className="text-xs text-ink-500">Sentiment</p>
                          </div>
                          <div className="card text-center">
                            <p className="font-display text-xl font-700 text-ink-50">{gapAnalysis.sentimentScore}</p>
                            <p className="text-xs text-ink-500">Sentiment Score</p>
                          </div>
                          <ScoreRing score={gapAnalysis.gapScore} size="md" label="Gap Score" />
                        </div>

                        <div className="card">
                          <p className="section-label mb-2">Summary</p>
                          <p className="text-sm text-ink-300">{gapAnalysis.summary}</p>
                        </div>

                        <div className="card">
                          <p className="section-label mb-3 flex items-center gap-1.5">
                            <TrendingDown size={11} /> Top Complaints (your opportunity)
                          </p>
                          <div className="space-y-3">
                            {gapAnalysis.topComplaints?.map((c, i) => (
                              <div key={i} className="border border-ink-700 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-sm font-medium text-ink-100">{c.issue}</p>
                                  <span className={clsx('badge', c.frequency === 'high' ? 'badge-red' : c.frequency === 'medium' ? 'badge-yellow' : 'badge-blue')}>
                                    {c.frequency}
                                  </span>
                                </div>
                                {c.quotes?.length > 0 && (
                                  <div className="space-y-1 mb-2">
                                    {c.quotes.map((q, j) => (
                                      <p key={j} className="text-xs text-ink-500 italic">"{q}"</p>
                                    ))}
                                  </div>
                                )}
                                <div className="bg-acid/5 border border-acid/20 rounded-lg px-3 py-2">
                                  <p className="text-xs text-acid">💡 {c.opportunity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="card">
                          <p className="section-label mb-3">Missing Features</p>
                          <div className="space-y-2">
                            {gapAnalysis.missingFeatures?.map((f, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-ink-900 rounded-lg">
                                <span className="text-acid text-xs mt-0.5">+</span>
                                <div>
                                  <p className="text-sm font-medium text-ink-100">{f.feature}</p>
                                  <p className="text-xs text-ink-500">{f.description}</p>
                                </div>
                                <span className={clsx('badge ml-auto flex-shrink-0', f.requestCount === 'many' ? 'badge-red' : 'badge-yellow')}>
                                  {f.requestCount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="card">
                          <p className="section-label mb-3">Strengths to Copy</p>
                          <div className="space-y-2">
                            {gapAnalysis.strengthsToCopy?.map((s, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-ink-900 rounded-lg">
                                <span className="text-green-400 text-xs mt-0.5">✓</span>
                                <div>
                                  <p className="text-sm font-medium text-ink-100">{s.strength}</p>
                                  <p className="text-xs text-ink-500">{s.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Zap size={24} className="text-ink-600 mx-auto mb-3" />
                        <p className="text-ink-400 text-sm mb-3">Click "Gap Analysis" to analyze user reviews with AI</p>
                        <button onClick={handleGapAnalysis} className="btn-primary text-sm">Run Gap Analysis</button>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'matrix' && (
                  <div>
                    {loadingMatrix ? <LoadingState message="Building competitor matrix..." /> :
                     matrix ? (
                      <div className="space-y-4">
                        <div className="card">
                          <p className="section-label mb-2">Landscape Summary</p>
                          <p className="text-sm text-ink-300">{matrix.summary}</p>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-ink-500">Market Leader</p>
                              <p className="text-sm font-medium text-acid">{matrix.leader}</p>
                            </div>
                            <div>
                              <p className="text-xs text-ink-500">Most Vulnerable</p>
                              <p className="text-sm font-medium text-red-400">{matrix.mostVulnerable}</p>
                            </div>
                          </div>
                        </div>
                        <div className="card">
                          <p className="section-label mb-2">Main Gap</p>
                          <p className="text-sm text-ink-300">{matrix.marketGap}</p>
                        </div>
                        <div className="space-y-3">
                          {matrix.comparison?.map((c, i) => {
                            const app = matrix.apps?.find(a => a.appId === c.appId);
                            return (
                              <div key={i} className="card">
                                <div className="flex items-center gap-3 mb-3">
                                  {app && <img src={app.icon} className="w-8 h-8 rounded-xl" alt="" />}
                                  <div>
                                    <p className="text-sm font-medium text-ink-100">{app?.title || c.appId}</p>
                                    {app && <Stars score={app.score} />}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-green-400 mb-1">Strengths</p>
                                    <ul className="space-y-0.5">
                                      {c.strengths?.map((s, j) => <li key={j} className="text-xs text-ink-400">+ {s}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-xs text-red-400 mb-1">Weaknesses</p>
                                    <ul className="space-y-0.5">
                                      {c.weaknesses?.map((w, j) => <li key={j} className="text-xs text-ink-400">- {w}</li>)}
                                    </ul>
                                  </div>
                                </div>
                                <div className="mt-3 bg-acid/5 border border-acid/20 rounded-lg px-3 py-2">
                                  <p className="text-xs text-acid">💡 {c.opportunity}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                     ) : (
                      <div className="text-center py-12">
                        <p className="text-sm text-ink-400">Add apps to compare using the + button, then click "Run Matrix"</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedApp && searchResults.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Search size={32} className="text-ink-700 mx-auto mb-4" />
              <p className="text-ink-400">Search for any app to analyze it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
