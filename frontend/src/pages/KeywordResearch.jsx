import { useState } from 'react';
import { keywordsAPI, appsAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { dbOps } from '../lib/db.js';
import { PageHeader, CountrySelect, LoadingState, ErrorState, KeywordBadge, AppCard, TabBar, SkeletonCard } from '../components/UI.jsx';
import { Search, Download, Save, Layers, TrendingUp, Activity, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function trafficColor(label) {
  return label === 'Very High' ? 'bg-blue-100 text-blue-700'
    : label === 'High' ? 'bg-green-100 text-green-700'
    : label === 'Medium' ? 'bg-amber-100 text-amber-700'
    : 'bg-slate-100 text-slate-500';
}

function difficultyColor(score) {
  return score < 40 ? 'bg-emerald-100 text-emerald-700'
    : score < 70 ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';
}

function difficultyLabel(score) {
  return score < 40 ? 'Easy' : score < 70 ? 'Medium' : 'Hard';
}

export default function KeywordResearch() {
  const { country, setCountry } = useSettings();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('suggestions');
  const [loading, setLoading] = useState(false);
  const [expandLoading, setExpandLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);

  const [suggestions, setSuggestions] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [difficulty, setDifficulty] = useState([]);
  const [topApps, setTopApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rank tracking
  const [trackedKeywords] = useState(() => dbOps.getTrackedRankKeywords());
  const [rankHistoryKw, setRankHistoryKw] = useState(null);
  const [rankHistory, setRankHistory] = useState([]);

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

  const handleTrackRank = async (kw) => {
    try {
      const apps = await appsAPI.search(kw, 'android', country, 20);
      dbOps.saveRankSnapshot(kw, country, apps);
      toast.success(`Rank snapshot saved for "${kw}"`);
    } catch {
      toast.error('Failed to save rank snapshot');
    }
  };

  const handleViewHistory = (kw) => {
    setRankHistoryKw(kw);
    setRankHistory(dbOps.getRankHistory(kw));
    setTab('rankHistory');
  };

  const handleSave = async () => {
    if (!suggestions) return;
    try {
      await dbOps.saveSearch(null, {
        type: 'keyword', query, country,
        keywords: suggestions.combined,
        total: suggestions.combined?.length
      });
      toast.success('Search saved!');
    } catch { toast.error('Failed to save'); }
  };

  const handleBulkAnalyze = async () => {
    const kws = bulkInput.split('\n').map(k => k.trim()).filter(Boolean).slice(0, 50);
    if (!kws.length) return;
    setBulkLoading(true); setBulkResults([]);
    try {
      const data = await keywordsAPI.difficulty(kws, country);
      setBulkResults(data);
      setTab('bulk');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const exportCSV = () => {
    const source = tab === 'bulk' ? bulkResults : tab === 'difficulty' ? difficulty : null;
    if (source?.length) {
      const header = 'keyword,difficulty,traffic_score,traffic_label,competition,avg_rating,avg_reviews\n';
      const rows = source.map(k =>
        `"${k.keyword}",${k.difficulty},${k.trafficScore ?? ''},${k.trafficLabel ?? ''},${k.competition},${k.avgRating},${k.avgReviews || 0}`
      ).join('\n');
      downloadCSV(header + rows, `keywords-${tab}.csv`);
      return;
    }
    const kws = tab === 'expanded' ? expanded?.keywords : suggestions?.combined;
    if (!kws?.length) return;
    downloadCSV('keyword\n' + kws.join('\n'), `keywords-${query}.csv`);
  };

  function downloadCSV(content, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    a.download = filename;
    a.click();
  }

  const tabs = [
    { id: 'suggestions', label: 'Suggestions', count: suggestions?.combined?.length },
    { id: 'expanded', label: 'A-Z Expansion', count: expanded?.total },
    { id: 'difficulty', label: 'Difficulty + Traffic', count: difficulty?.length },
    { id: 'bulk', label: 'Bulk Analysis', count: bulkResults?.length },
    { id: 'rankHistory', label: 'Rank History', count: trackedKeywords.length },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Keyword Research"
        subtitle="Discover high-traffic, low-competition keywords for Play Store and App Store"
        action={
          <div className="flex gap-2">
            {suggestions && (
              <>
                <button onClick={handleSave} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Save size={13} /> Save
                </button>
                <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Download size={13} /> Export CSV
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
          {expandLoading ? 'Expanding...' : 'A-Z Expand'}
        </button>
      </form>

      {/* Bulk analysis panel */}
      <div className="card mb-5 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Bulk Keyword Analysis <span className="font-normal normal-case text-slate-400 ml-1">up to 50 keywords</span>
            </p>
            <textarea
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder={"meditation app\nhabit tracker\nbudget planner\nfitness coach\n…one per line"}
              className="input h-20 resize-none font-mono text-xs"
            />
          </div>
          <div className="pt-6 flex flex-col gap-2">
            <button onClick={handleBulkAnalyze} disabled={bulkLoading || !bulkInput.trim()} className="btn-primary text-sm whitespace-nowrap">
              {bulkLoading ? 'Analyzing…' : 'Analyze All'}
            </button>
            {bulkResults.length > 0 && (
              <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={handleSearch} />}

      {(suggestions || tab === 'rankHistory') && (
        <div className="flex gap-6">
          {/* Left: Keywords */}
          <div className="flex-1 min-w-0">
            <TabBar tabs={tabs} active={tab} onChange={setTab} />

            {tab === 'suggestions' && suggestions && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="card">
                    <p className="section-label mb-2">Play Store ({suggestions.play?.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.play?.length ? suggestions.play.map(k => (
                        <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                      )) : <p className="text-xs text-slate-400">No suggestions</p>}
                    </div>
                  </div>
                  <div className="card">
                    <p className="section-label mb-2">App Store ({suggestions.apple?.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.apple?.length ? suggestions.apple.map(k => (
                        <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                      )) : <p className="text-xs text-slate-400">No suggestions</p>}
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="section-label">All Combined ({suggestions.combined?.length})</p>
                    <button onClick={handleDifficulty} className="btn-secondary flex items-center gap-1.5 text-xs" disabled={diffLoading}>
                      <TrendingUp size={12} />
                      {diffLoading ? 'Analyzing...' : 'Analyze Difficulty + Traffic'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.combined?.map(k => (
                      <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'expanded' && (
              <div className="card">
                {expandLoading ? <LoadingState message="Running A-Z expansion across both stores..." /> : expanded ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-slate-700">{expanded.total} keywords found</p>
                      <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1">
                        <Download size={11} /> Export CSV
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-96 overflow-y-auto">
                      {expanded.keywords?.map(k => (
                        <KeywordBadge key={k} keyword={k} onClick={handleKeywordClick} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Click "A-Z Expand" above to get 100+ keyword variations.</p>
                )}
              </div>
            )}

            {tab === 'difficulty' && (
              <div>
                {diffLoading ? <LoadingState message="Checking competition and traffic for each keyword..." /> : difficulty.length > 0 ? (
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Keyword</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Difficulty</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Traffic</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Competitors</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Avg Reviews</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {difficulty.sort((a, b) => (b.trafficScore ?? 0) - (a.trafficScore ?? 0)).map((kw, i) => (
                          <tr
                            key={kw.keyword}
                            className={clsx('border-b border-slate-50 hover:bg-blue-50/50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}
                          >
                            <td className="px-4 py-2.5">
                              <button className="font-medium text-slate-800 hover:text-blue-600 text-left" onClick={() => handleKeywordClick(kw.keyword)}>
                                {kw.keyword}
                              </button>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', difficultyColor(kw.difficulty))}>
                                {difficultyLabel(kw.difficulty)} · {kw.difficulty}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', trafficColor(kw.trafficLabel))}>
                                  {kw.trafficLabel ?? '—'}
                                </span>
                                <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-400 h-1.5 rounded-full"
                                    style={{ width: `${kw.trafficScore ?? 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{kw.competition}</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{kw.avgReviews?.toLocaleString()}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => handleTrackRank(kw.keyword)}
                                title="Save rank snapshot"
                                className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1"
                              >
                                <Activity size={11} /> Track
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="card text-center py-10">
                    <p className="text-sm text-slate-400">Select "Suggestions" tab first, then click "Analyze Difficulty + Traffic".</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'bulk' && (
              <div>
                {bulkLoading ? <LoadingState message="Analyzing all keywords in parallel…" /> : bulkResults.length > 0 ? (
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Keyword</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Difficulty</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Traffic</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Competitors</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Avg Rating</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Avg Reviews</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.sort((a, b) => (b.trafficScore ?? 0) - (a.trafficScore ?? 0)).map((kw, i) => (
                          <tr
                            key={kw.keyword}
                            className={clsx('border-b border-slate-50 hover:bg-blue-50/50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}
                          >
                            <td className="px-4 py-2.5">
                              <button className="font-medium text-slate-800 hover:text-blue-600 text-left" onClick={() => handleKeywordClick(kw.keyword)}>
                                {kw.keyword}
                              </button>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', difficultyColor(kw.difficulty))}>
                                {difficultyLabel(kw.difficulty)} · {kw.difficulty}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', trafficColor(kw.trafficLabel))}>
                                {kw.trafficLabel ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{kw.competition}</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{kw.avgRating}★</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{kw.avgReviews?.toLocaleString()}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => handleTrackRank(kw.keyword)}
                                title="Save rank snapshot"
                                className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1"
                              >
                                <Activity size={11} /> Track
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="card text-center py-10">
                    <p className="text-sm text-slate-400">Paste keywords above and click "Analyze All".</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'rankHistory' && (
              <div className="space-y-4">
                {trackedKeywords.length === 0 ? (
                  <div className="card text-center py-10">
                    <Activity size={24} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No rank snapshots yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Track" on any keyword in the Difficulty or Bulk tabs.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {trackedKeywords.map(kw => (
                        <button
                          key={kw}
                          onClick={() => handleViewHistory(kw)}
                          className={clsx(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all',
                            rankHistoryKw === kw
                              ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                              : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'
                          )}
                        >
                          <Clock size={11} />
                          {kw}
                          <span className="text-xs text-slate-400">{dbOps.getRankHistory(kw).length} snapshots</span>
                        </button>
                      ))}
                    </div>

                    {rankHistoryKw && rankHistory.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">
                            Rank history for "{rankHistoryKw}"
                          </p>
                          <button
                            onClick={() => {
                              dbOps.deleteRankHistory(rankHistoryKw);
                              setRankHistory([]);
                              setRankHistoryKw(null);
                              toast.success('History deleted');
                            }}
                            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 size={11} /> Clear
                          </button>
                        </div>
                        {rankHistory.map((snapshot) => (
                          <div key={snapshot.id} className="card">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-slate-500">
                                {new Date(snapshot.date).toLocaleString()} · {snapshot.country?.toUpperCase()}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              {snapshot.apps.slice(0, 10).map((app) => (
                                <div key={app.appId} className="flex items-center gap-3">
                                  <span className="text-xs font-mono text-slate-400 w-5 text-right">#{app.rank}</span>
                                  {app.icon && <img src={app.icon} className="w-6 h-6 rounded" alt="" />}
                                  <span className="text-sm text-slate-700 flex-1 truncate">{app.title}</span>
                                  <span className="text-xs text-amber-500">{app.score?.toFixed(1)}★</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Apps for selected keyword */}
          {selectedKeyword && (
            <div className="w-64 flex-shrink-0">
              <div className="card sticky top-4">
                <p className="section-label mb-1">Top apps for</p>
                <p className="text-sm font-semibold text-slate-800 mb-3">"{selectedKeyword}"</p>
                <button
                  onClick={() => handleTrackRank(selectedKeyword)}
                  className="w-full btn-secondary text-xs flex items-center justify-center gap-1.5 mb-3"
                >
                  <Activity size={11} /> Save Rank Snapshot
                </button>
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

      {!suggestions && tab !== 'rankHistory' && !loading && !error && (
        <div className="text-center py-20">
          <Search size={32} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Enter a niche to discover keywords</p>
          <p className="text-xs text-slate-400 mt-1">Try: "meditation", "finance tracker", "language learning"</p>
        </div>
      )}
    </div>
  );
}
