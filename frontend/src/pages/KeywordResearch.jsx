import { useState, useRef } from 'react';
import { keywordsAPI, appsAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { dbOps } from '../lib/db.js';
import { PageHeader, CountrySelect, LoadingState, ErrorState, KeywordBadge, AppCard, TabBar, SkeletonCard } from '../components/UI.jsx';
import { Search, Download, Save, ChevronRight, AlertCircle, TrendingUp, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function KeywordResearch() {
  const { country, setCountry } = useSettings();
  const [query, setQuery] = useState('');
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
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

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
    if (!suggestions) return;
    try {
      await dbOps.saveSearch(null, {
        type: 'keyword',
        query,
        country,
        keywords: suggestions.combined,
        total: suggestions.combined?.length
      });
      toast.success('Search saved!');
    } catch { toast.error('Failed to save'); }
  };

  const handleBulkAnalyze = async () => {
    const kws = bulkInput.split('\n').map(k => k.trim()).filter(Boolean).slice(0, 50);
    if (!kws.length) return;
    setBulkLoading(true);
    setBulkResults([]);
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
    if (tab === 'bulk' && bulkResults.length) {
      const header = 'keyword,difficulty,competition,avg_rating,avg_reviews\n';
      const rows = bulkResults.map(k =>
        `"${k.keyword}",${k.difficulty},${k.competition},${k.avgRating},${k.avgReviews || 0}`
      ).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
      a.download = `bulk-keyword-analysis.csv`;
      a.click();
      return;
    }
    if (tab === 'difficulty' && difficulty.length) {
      const header = 'keyword,difficulty,competition,avg_rating,avg_reviews\n';
      const rows = difficulty.map(k =>
        `"${k.keyword}",${k.difficulty},${k.competition},${k.avgRating},${k.avgReviews || 0}`
      ).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
      a.download = `keyword-difficulty-${query}.csv`;
      a.click();
      return;
    }
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
    { id: 'bulk', label: 'Bulk Analysis', count: bulkResults?.length },
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

      {/* Bulk analysis panel — always visible */}
      <div className="card mb-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="section-label mb-1.5">Bulk Keyword Analysis <span className="text-[10px] font-normal text-slate-400 ml-1">up to 50 keywords</span></p>
            <textarea
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder={"meditation app\nhabit tracker\nbudget planner\nfitness coach\n…one per line"}
              className="input h-24 resize-none font-mono text-xs"
            />
          </div>
          <div className="pt-6 flex flex-col gap-2">
            <button
              onClick={handleBulkAnalyze}
              disabled={bulkLoading || !bulkInput.trim()}
              className="btn-primary text-sm whitespace-nowrap"
            >
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

            {tab === 'bulk' && (
              <div>
                {bulkLoading ? <LoadingState message="Analyzing all keywords in parallel…" /> : bulkResults.length > 0 ? (
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Keyword</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Difficulty</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Competitors</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Avg Rating</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Avg Reviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.sort((a, b) => a.difficulty - b.difficulty).map((kw, i) => (
                          <tr
                            key={kw.keyword}
                            className={clsx('border-b border-slate-50 cursor-pointer hover:bg-blue-50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
                            onClick={() => handleKeywordClick(kw.keyword)}
                          >
                            <td className="px-4 py-2.5 font-medium text-slate-800">{kw.keyword}</td>
                            <td className="px-4 py-2.5">
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold',
                                kw.difficulty < 40 ? 'bg-emerald-100 text-emerald-700' :
                                kw.difficulty < 70 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              )}>
                                {kw.difficulty < 40 ? 'Easy' : kw.difficulty < 70 ? 'Medium' : 'Hard'} {kw.difficulty}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">{kw.competition}</td>
                            <td className="px-4 py-2.5 text-slate-600">{kw.avgRating}★</td>
                            <td className="px-4 py-2.5 text-slate-600">{kw.avgReviews?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Paste keywords above and click "Analyze All".</p>
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
