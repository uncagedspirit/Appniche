import { useState } from 'react';
import { appsAPI, analysisAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { dbOps } from '../lib/db.js';
import { PageHeader, PlatformToggle, CountrySelect, LoadingState, ErrorState, Stars, TabBar, AppCard, ScoreRing } from '../components/UI.jsx';
import { Search, Plus, Trash2, Zap, Save, TrendingDown, FileText, BarChart2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Text Analyzer helpers ────────────────────────────────────────────────────

function analyzeText(appDetail) {
  if (!appDetail) return null;
  const title = appDetail.title || '';
  const desc = appDetail.description || '';
  const summary = appDetail.summary || '';

  const titleLen = title.length;
  const descLen = desc.length;
  const wordCount = desc.split(/\s+/).filter(Boolean).length;
  const screenshotCount = appDetail.screenshotCount || 0;
  const hasVideo = !!appDetail.hasVideo;

  // Title score: 20-30 chars is ideal for Play Store (keyword + brand)
  const titleScore = titleLen >= 15 && titleLen <= 30 ? 100
    : titleLen > 30 && titleLen <= 50 ? 75
    : titleLen > 0 ? 40 : 0;

  // Description score: 2000-4000 chars is optimal
  const descScore = descLen >= 2000 && descLen <= 4000 ? 100
    : descLen >= 1000 ? 70
    : descLen >= 500 ? 45
    : descLen > 0 ? 25 : 0;

  // Screenshot score: 5-8 is ideal
  const ssScore = screenshotCount >= 6 ? 100
    : screenshotCount >= 4 ? 75
    : screenshotCount >= 2 ? 50
    : screenshotCount > 0 ? 25 : 0;

  // Video bonus
  const videoScore = hasVideo ? 100 : 0;

  // Summary/short description score
  const summaryScore = summary.length >= 50 ? 100 : summary.length > 0 ? 50 : 0;

  const overall = Math.round(
    titleScore * 0.25 +
    descScore * 0.35 +
    ssScore * 0.20 +
    videoScore * 0.10 +
    summaryScore * 0.10
  );

  const recommendations = [];
  if (titleLen < 15) recommendations.push({ field: 'Title', type: 'warning', msg: `Too short (${titleLen} chars). Aim for 20–30 chars — include your primary keyword.` });
  else if (titleLen > 50) recommendations.push({ field: 'Title', type: 'warning', msg: `Too long (${titleLen} chars). Google truncates titles after ~50 chars in search.` });
  else recommendations.push({ field: 'Title', type: 'ok', msg: `Good length (${titleLen} chars).` });

  if (descLen < 500) recommendations.push({ field: 'Description', type: 'error', msg: `Very short (${descLen} chars / ${wordCount} words). Play Store rewards detailed descriptions — aim for 2,000+ chars.` });
  else if (descLen < 1500) recommendations.push({ field: 'Description', type: 'warning', msg: `Moderate length (${descLen} chars). Expanding to 2,000–4,000 chars can improve keyword coverage.` });
  else recommendations.push({ field: 'Description', type: 'ok', msg: `Good length (${descLen} chars / ${wordCount} words).` });

  if (screenshotCount < 4) recommendations.push({ field: 'Screenshots', type: 'error', msg: `Only ${screenshotCount} screenshots. Use 6–8 to showcase features and drive conversions.` });
  else if (screenshotCount < 6) recommendations.push({ field: 'Screenshots', type: 'warning', msg: `${screenshotCount} screenshots. Adding 1-2 more (up to 8) typically increases installs.` });
  else recommendations.push({ field: 'Screenshots', type: 'ok', msg: `${screenshotCount} screenshots — well covered.` });

  if (!hasVideo) recommendations.push({ field: 'Preview Video', type: 'warning', msg: 'No preview video. Apps with videos see up to 35% higher conversion on Play Store.' });
  else recommendations.push({ field: 'Preview Video', type: 'ok', msg: 'Preview video present.' });

  if (summary.length < 30) recommendations.push({ field: 'Short Description', type: 'warning', msg: 'Short description is missing or too brief. This appears in search results — include a clear value prop + keyword.' });
  else recommendations.push({ field: 'Short Description', type: 'ok', msg: `Short description present (${summary.length} chars).` });

  return {
    overall, titleScore, descScore, ssScore, videoScore, summaryScore,
    titleLen, descLen, wordCount, screenshotCount, hasVideo,
    recommendations,
  };
}

// ─── Store Benchmarks helpers ─────────────────────────────────────────────────

function buildBenchmarks(appDetail, similar) {
  if (!appDetail || similar.length === 0) return null;
  const peers = similar.filter(a => a.score && a.reviews);
  if (peers.length < 3) return null;

  const avg = (arr, fn) => arr.reduce((s, a) => s + (fn(a) || 0), 0) / arr.length;

  const categoryAvgRating = avg(peers, a => a.score);
  const categoryAvgReviews = avg(peers, a => a.reviews || 0);
  const categoryAvgInstalls = avg(peers, a => a.minInstalls || 0);

  return {
    peerCount: peers.length,
    metrics: [
      {
        label: 'Rating',
        app: appDetail.score,
        category: parseFloat(categoryAvgRating.toFixed(2)),
        format: v => v?.toFixed(2) + '★',
        higher: true,
      },
      {
        label: 'Reviews',
        app: appDetail.reviews,
        category: Math.round(categoryAvgReviews),
        format: v => v?.toLocaleString(),
        higher: true,
      },
      {
        label: 'Min Installs',
        app: appDetail.minInstalls,
        category: Math.round(categoryAvgInstalls),
        format: v => v ? v.toLocaleString() : 'N/A',
        higher: true,
      },
      {
        label: 'Screenshots',
        app: appDetail.screenshotCount,
        category: Math.round(avg(peers, a => a.screenshotCount || 0)),
        format: v => v ?? 'N/A',
        higher: true,
      },
      {
        label: 'ASO Score',
        app: appDetail.asoScore,
        category: Math.round(avg(peers, a => a.asoScore || 0)),
        format: v => v ?? 'N/A',
        higher: true,
      },
    ],
  };
}

// ─── ASO Report export ────────────────────────────────────────────────────────

function exportASOReport(appDetail, textAnalysis, benchmarks, gapAnalysis) {
  const lines = [];
  lines.push(`ASO Report — ${appDetail.title}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('='.repeat(60));
  lines.push('');

  lines.push('APP OVERVIEW');
  lines.push(`Title: ${appDetail.title}`);
  lines.push(`Developer: ${appDetail.developer}`);
  lines.push(`Category: ${appDetail.genre}`);
  lines.push(`Rating: ${appDetail.score?.toFixed(2)} (${appDetail.reviews?.toLocaleString()} reviews)`);
  lines.push(`Installs: ${appDetail.minInstalls?.toLocaleString()}`);
  lines.push('');

  if (textAnalysis) {
    lines.push('TEXT & METADATA ANALYSIS');
    lines.push(`Overall Metadata Score: ${textAnalysis.overall}/100`);
    lines.push(`Title: ${appDetail.title} (${textAnalysis.titleLen} chars)`);
    lines.push(`Description: ${textAnalysis.descLen} chars / ${textAnalysis.wordCount} words`);
    lines.push(`Screenshots: ${textAnalysis.screenshotCount}`);
    lines.push(`Preview Video: ${textAnalysis.hasVideo ? 'Yes' : 'No'}`);
    lines.push('');
    lines.push('Recommendations:');
    textAnalysis.recommendations.forEach(r => {
      const prefix = r.type === 'ok' ? '✓' : r.type === 'warning' ? '⚠' : '✗';
      lines.push(`  ${prefix} [${r.field}] ${r.msg}`);
    });
    lines.push('');
  }

  if (benchmarks) {
    lines.push('STORE BENCHMARKS (vs similar apps)');
    benchmarks.metrics.forEach(m => {
      const delta = ((m.app ?? 0) - m.category);
      const sign = delta >= 0 ? '+' : '';
      lines.push(`  ${m.label}: ${m.format(m.app)} vs category avg ${m.format(m.category)} (${sign}${typeof delta === 'number' && !isNaN(delta) ? delta.toFixed(1) : '?'})`);
    });
    lines.push('');
  }

  if (gapAnalysis) {
    lines.push('GAP ANALYSIS SUMMARY');
    lines.push(`Sentiment: ${gapAnalysis.overallSentiment} (score: ${gapAnalysis.sentimentScore})`);
    lines.push(`Gap Score: ${gapAnalysis.gapScore}`);
    lines.push(gapAnalysis.summary || '');
    lines.push('');
    if (gapAnalysis.topComplaints?.length) {
      lines.push('Top User Complaints:');
      gapAnalysis.topComplaints.slice(0, 5).forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.issue} [${c.frequency}] — ${c.opportunity}`);
      });
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aso-report-${appDetail.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
  a.click();
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  const textAnalysis = appDetail ? analyzeText(appDetail) : null;
  const benchmarks = appDetail ? buildBenchmarks(appDetail, similar) : null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'textAnalyzer', label: 'Text Analyzer' },
    { id: 'benchmarks', label: 'Benchmarks' },
    { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'similar', label: 'Similar', count: similar.length },
    { id: 'gaps', label: 'Gap Analysis' },
    { id: 'matrix', label: 'Competitor Matrix' },
  ];

  const sentimentColor = (s) => s === 'positive' ? 'text-green-600' : s === 'negative' ? 'text-red-500' : 'text-amber-500';

  const typeIcon = (type) => type === 'ok' ? '✓' : type === 'warning' ? '⚠' : '✗';
  const typeClass = (type) => type === 'ok' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : type === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="App Analyzer"
        subtitle="Deep dive into any app — metadata quality, benchmarks, reviews, gaps"
        action={
          appDetail && (
            <button
              onClick={() => exportASOReport(appDetail, textAnalysis, benchmarks, gapAnalysis)}
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              <Download size={13} /> Export ASO Report
            </button>
          )
        }
      />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {searchResults.map(app => (
                <div key={app.appId} className="relative group">
                  <AppCard app={app} onClick={handleSelectApp} selected={selectedApp?.appId === app.appId} />
                  <button
                    onClick={() => handleAddToMatrix(app)}
                    title="Add to comparison"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 bg-slate-700 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              ))}
            </div>

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
                      <span className="text-xs text-slate-600 flex-1 truncate">{app.title}</span>
                      <button onClick={() => setComparedApps(p => p.filter(a => a.appId !== app.appId))}>
                        <Trash2 size={10} className="text-slate-400 hover:text-red-500" />
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
          <div className="flex-1 min-w-0">
            {loadingDetail ? <LoadingState message="Loading app details..." /> : appDetail && (
              <>
                {/* App header */}
                <div className="card mb-4">
                  <div className="flex items-start gap-4">
                    <img src={appDetail.icon} className="w-16 h-16 rounded-2xl flex-shrink-0" alt={appDetail.title} />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-lg text-slate-800 truncate">{appDetail.title}</h2>
                      <p className="text-sm text-slate-500">{appDetail.developer}</p>
                      <div className="flex items-center flex-wrap gap-3 mt-2">
                        <Stars score={appDetail.score} />
                        <span className="text-xs text-slate-400">{appDetail.reviews?.toLocaleString()} reviews</span>
                        {appDetail.installs && <span className="text-xs text-slate-400">{appDetail.installs}</span>}
                        <span className="badge-blue text-xs">{appDetail.genre}</span>
                        {appDetail.free ? <span className="badge-green text-xs">Free</span> : <span className="badge-yellow text-xs">${appDetail.price}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => appDetail && handleTrack(appDetail)} className="btn-secondary text-xs">
                        <Save size={12} className="inline mr-1" /> Track
                      </button>
                      <button onClick={handleGapAnalysis} className="btn-primary text-xs flex items-center gap-1" disabled={loadingGap}>
                        <Zap size={12} />
                        {loadingGap ? 'Analyzing...' : 'Gap Analysis'}
                      </button>
                    </div>
                  </div>
                </div>

                <TabBar tabs={tabs} active={tab} onChange={setTab} />

                {/* ── Overview ── */}
                {tab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="card text-center">
                        <p className="font-bold text-xl text-amber-500">{appDetail.score?.toFixed(1)}</p>
                        <p className="text-xs text-slate-400 mt-1">Rating</p>
                      </div>
                      <div className="card text-center">
                        <p className="font-bold text-xl text-slate-700">{appDetail.reviews?.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">Reviews</p>
                      </div>
                      <div className="card text-center">
                        <p className="font-bold text-xl text-slate-700">{appDetail.minInstalls?.toLocaleString() || 'N/A'}</p>
                        <p className="text-xs text-slate-400 mt-1">Min Installs</p>
                      </div>
                    </div>
                    <div className="card">
                      <p className="section-label mb-3">Details</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {[
                          ['Version', appDetail.version],
                          ['Updated', appDetail.updated],
                          ['Released', appDetail.released],
                          ['Size', appDetail.size],
                          ['Content Rating', appDetail.contentRating],
                          ['Android Version', appDetail.androidVersion],
                        ].map(([k, v]) => v ? (
                          <div key={k} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-400">{k}</span>
                            <span className="text-slate-700 font-medium">{v}</span>
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
                                <span className="text-xs text-slate-400 w-4">{star}★</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                  <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {appDetail.recentChanges && (
                      <div className="card">
                        <p className="section-label mb-2">Latest Changes</p>
                        <p className="text-sm text-slate-600">{appDetail.recentChanges}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Text Analyzer ── */}
                {tab === 'textAnalyzer' && textAnalysis && (
                  <div className="space-y-4">
                    <div className="card flex items-center gap-6">
                      <ScoreRing score={textAnalysis.overall} size="lg" label="Metadata Score" />
                      <div className="grid grid-cols-2 gap-x-10 gap-y-2 flex-1 text-sm">
                        {[
                          ['Title', textAnalysis.titleScore],
                          ['Description', textAnalysis.descScore],
                          ['Screenshots', textAnalysis.ssScore],
                          ['Preview Video', textAnalysis.videoScore],
                          ['Short Description', textAnalysis.summaryScore],
                        ].map(([label, score]) => (
                          <div key={label} className="flex items-center gap-3">
                            <span className="text-slate-500 w-36 flex-shrink-0">{label}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div
                                className={clsx('h-1.5 rounded-full', score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400')}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right font-mono">{score}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <p className="section-label mb-3 flex items-center gap-1.5"><FileText size={13} /> Field Analysis</p>
                      <div className="space-y-2">
                        {textAnalysis.recommendations.map((r, i) => (
                          <div key={i} className={clsx('flex items-start gap-3 rounded-lg px-4 py-3 border text-sm', typeClass(r.type))}>
                            <span className="font-bold flex-shrink-0">{typeIcon(r.type)}</span>
                            <div>
                              <span className="font-semibold mr-2">{r.field}:</span>
                              {r.msg}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <p className="section-label mb-2">Title Preview</p>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-sm font-medium text-slate-800">{appDetail.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{textAnalysis.titleLen} chars · {textAnalysis.titleLen <= 30 ? 'Fits in search results' : 'May be truncated in search results'}</p>
                      </div>
                    </div>

                    <div className="card">
                      <p className="section-label mb-2">Description Excerpt (first 300 chars)</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{(appDetail.description || '').slice(0, 300)}{appDetail.description?.length > 300 ? '…' : ''}</p>
                      <p className="text-xs text-slate-400 mt-2">{textAnalysis.descLen} chars · {textAnalysis.wordCount} words</p>
                    </div>
                  </div>
                )}

                {/* ── Store Benchmarks ── */}
                {tab === 'benchmarks' && (
                  <div className="space-y-4">
                    {!benchmarks ? (
                      <div className="card text-center py-10">
                        <BarChart2 size={24} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">Need at least 3 similar apps to compute benchmarks.</p>
                        <p className="text-xs text-slate-400 mt-1">Similar apps load automatically when you select an app.</p>
                      </div>
                    ) : (
                      <>
                        <div className="card">
                          <p className="section-label mb-1">Benchmarks vs similar apps</p>
                          <p className="text-xs text-slate-400 mb-4">Compared against {benchmarks.peerCount} similar apps in the same category</p>
                          <div className="space-y-4">
                            {benchmarks.metrics.map((m) => {
                              const appVal = m.app ?? 0;
                              const catVal = m.category ?? 1;
                              const ratio = catVal > 0 ? appVal / catVal : 0;
                              const isAbove = appVal >= catVal;
                              const pctOfMax = Math.min(100, (Math.max(appVal, catVal) > 0 ? (appVal / Math.max(appVal, catVal)) * 100 : 0));
                              const catPct = Math.min(100, (catVal / Math.max(appVal, catVal)) * 100);

                              return (
                                <div key={m.label}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-slate-700">{m.label}</span>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className={clsx('font-semibold', isAbove ? 'text-emerald-600' : 'text-red-500')}>
                                        {m.format(m.app)} <span className="text-xs font-normal">(you)</span>
                                      </span>
                                      <span className="text-slate-400">{m.format(m.category)} <span className="text-xs">avg</span></span>
                                    </div>
                                  </div>
                                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="absolute left-0 top-0 h-full bg-blue-200 rounded-full" style={{ width: `${catPct}%` }} />
                                    <div
                                      className={clsx('absolute left-0 top-0 h-full rounded-full', isAbove ? 'bg-emerald-400' : 'bg-red-400')}
                                      style={{ width: `${pctOfMax}%`, opacity: 0.85 }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-xs text-slate-400">0</span>
                                    <span className={clsx('text-xs font-medium', isAbove ? 'text-emerald-600' : 'text-red-500')}>
                                      {isAbove ? `+${((ratio - 1) * 100).toFixed(0)}% above avg` : `${((1 - ratio) * 100).toFixed(0)}% below avg`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="card">
                          <p className="section-label mb-3">Similar Apps Used for Benchmark</p>
                          <div className="grid grid-cols-2 gap-2">
                            {similar.slice(0, 6).map(app => (
                              <AppCard key={app.appId} app={app} onClick={handleSelectApp} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Reviews ── */}
                {tab === 'reviews' && (
                  <div className="space-y-3">
                    {reviews.slice(0, 30).map(r => (
                      <div key={r.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-medium text-slate-700">{r.userName}</p>
                            <p className="text-xs text-slate-400">{r.date ? new Date(r.date).toLocaleDateString() : ''}</p>
                          </div>
                          <div className="flex">
                            {[1,2,3,4,5].map(i => (
                              <span key={i} style={{fontSize:'10px'}} className={i <= r.score ? 'text-amber-400' : 'text-slate-200'}>★</span>
                            ))}
                          </div>
                        </div>
                        {r.title && <p className="text-sm font-medium text-slate-700 mb-1">{r.title}</p>}
                        <p className="text-sm text-slate-500">{r.text}</p>
                        {r.replyText && (
                          <div className="mt-2 pl-3 border-l-2 border-slate-200">
                            <p className="text-xs text-slate-400 font-medium mb-0.5">Developer reply</p>
                            <p className="text-xs text-slate-400">{r.replyText}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Similar ── */}
                {tab === 'similar' && (
                  <div className="grid grid-cols-2 gap-3">
                    {similar.map(app => (
                      <AppCard key={app.appId} app={app} onClick={handleSelectApp} />
                    ))}
                  </div>
                )}

                {/* ── Gap Analysis ── */}
                {tab === 'gaps' && (
                  <div>
                    {loadingGap ? <LoadingState message="Claude is reading reviews and finding gaps..." /> :
                     gapAnalysis ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="card text-center">
                            <p className={clsx('font-bold text-lg', sentimentColor(gapAnalysis.overallSentiment))}>
                              {gapAnalysis.overallSentiment}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Sentiment</p>
                          </div>
                          <div className="card text-center">
                            <p className="font-bold text-xl text-slate-700">{gapAnalysis.sentimentScore}</p>
                            <p className="text-xs text-slate-400 mt-1">Sentiment Score</p>
                          </div>
                          <ScoreRing score={gapAnalysis.gapScore} size="md" label="Gap Score" />
                        </div>

                        <div className="card">
                          <p className="section-label mb-2">Summary</p>
                          <p className="text-sm text-slate-600">{gapAnalysis.summary}</p>
                        </div>

                        <div className="card">
                          <p className="section-label mb-3 flex items-center gap-1.5">
                            <TrendingDown size={11} /> Top Complaints (your opportunity)
                          </p>
                          <div className="space-y-3">
                            {gapAnalysis.topComplaints?.map((c, i) => (
                              <div key={i} className="border border-slate-200 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-sm font-medium text-slate-700">{c.issue}</p>
                                  <span className={clsx('badge text-xs', c.frequency === 'high' ? 'badge-red' : c.frequency === 'medium' ? 'badge-yellow' : 'badge-blue')}>
                                    {c.frequency}
                                  </span>
                                </div>
                                {c.quotes?.length > 0 && (
                                  <div className="space-y-1 mb-2">
                                    {c.quotes.map((q, j) => (
                                      <p key={j} className="text-xs text-slate-400 italic">"{q}"</p>
                                    ))}
                                  </div>
                                )}
                                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                  <p className="text-xs text-blue-700">💡 {c.opportunity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="card">
                          <p className="section-label mb-3">Missing Features</p>
                          <div className="space-y-2">
                            {gapAnalysis.missingFeatures?.map((f, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                <span className="text-emerald-500 text-xs mt-0.5 font-bold">+</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-700">{f.feature}</p>
                                  <p className="text-xs text-slate-400">{f.description}</p>
                                </div>
                                <span className={clsx('badge ml-auto flex-shrink-0 text-xs', f.requestCount === 'many' ? 'badge-red' : 'badge-yellow')}>
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
                              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                <span className="text-emerald-500 text-xs mt-0.5 font-bold">✓</span>
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{s.strength}</p>
                                  <p className="text-xs text-slate-400">{s.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 card">
                        <Zap size={24} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm mb-3">Click "Gap Analysis" to analyze user reviews with AI</p>
                        <button onClick={handleGapAnalysis} className="btn-primary text-sm">Run Gap Analysis</button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Competitor Matrix ── */}
                {tab === 'matrix' && (
                  <div>
                    {loadingMatrix ? <LoadingState message="Building competitor matrix..." /> :
                     matrix ? (
                      <div className="space-y-4">
                        <div className="card">
                          <p className="section-label mb-2">Landscape Summary</p>
                          <p className="text-sm text-slate-600">{matrix.summary}</p>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-slate-400">Market Leader</p>
                              <p className="text-sm font-medium text-blue-600">{matrix.leader}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Most Vulnerable</p>
                              <p className="text-sm font-medium text-red-500">{matrix.mostVulnerable}</p>
                            </div>
                          </div>
                        </div>
                        <div className="card">
                          <p className="section-label mb-2">Main Market Gap</p>
                          <p className="text-sm text-slate-600">{matrix.marketGap}</p>
                        </div>
                        <div className="space-y-3">
                          {matrix.comparison?.map((c, i) => {
                            const app = matrix.apps?.find(a => a.appId === c.appId);
                            return (
                              <div key={i} className="card">
                                <div className="flex items-center gap-3 mb-3">
                                  {app && <img src={app.icon} className="w-8 h-8 rounded-xl" alt="" />}
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{app?.title || c.appId}</p>
                                    {app && <Stars score={app.score} />}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-emerald-600 mb-1 font-semibold">Strengths</p>
                                    <ul className="space-y-0.5">
                                      {c.strengths?.map((s, j) => <li key={j} className="text-xs text-slate-500">+ {s}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-xs text-red-500 mb-1 font-semibold">Weaknesses</p>
                                    <ul className="space-y-0.5">
                                      {c.weaknesses?.map((w, j) => <li key={j} className="text-xs text-slate-500">- {w}</li>)}
                                    </ul>
                                  </div>
                                </div>
                                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                  <p className="text-xs text-blue-700">💡 {c.opportunity}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                     ) : (
                      <div className="text-center py-12 card">
                        <p className="text-sm text-slate-400">Add apps to compare using the + button, then click "Run Matrix"</p>
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
              <Search size={32} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Search for any app to analyze it</p>
              <p className="text-xs text-slate-400 mt-1">Then explore metadata quality, benchmarks, reviews, and gaps</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
