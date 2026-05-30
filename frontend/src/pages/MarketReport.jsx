import { useState } from 'react';
import { analysisAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { PageHeader, CountrySelect, LoadingState } from '../components/UI.jsx';
import {
  FileText, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Star, Download, RefreshCw, Users, Package, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const VERDICT_CONFIG = {
  Go:     { icon: CheckCircle,  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  Caution:{ icon: AlertTriangle, bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-800' },
  Avoid:  { icon: XCircle,       bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-800' },
};

function ScoreRing({ score }) {
  const color = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const r = 36, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-slate-800">{score}</div>
        <div className="text-[10px] text-slate-500 font-medium">/ 100</div>
      </div>
    </div>
  );
}

function DifficultyBar({ value }) {
  const color = value >= 70 ? 'bg-red-400' : value >= 45 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-6 text-right">{value}</span>
    </div>
  );
}

function fmtInstalls(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function MarketReport() {
  const { country, setCountry } = useSettings();
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const handleGenerate = async () => {
    if (!niche.trim()) { toast.error('Enter a niche first'); return; }
    setLoading(true);
    setReport(null);
    try {
      const data = await analysisAPI.marketReport(niche.trim(), country);
      setReport(data);
    } catch (e) {
      toast.error(e.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;
    const lines = [
      `MARKET REPORT: ${report.niche.toUpperCase()}`,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}  |  Country: ${report.country.toUpperCase()}`,
      '',
      `VERDICT: ${report.verdict}`,
      report.verdictReason,
      '',
      `OPPORTUNITY SCORE: ${report.opportunityScore}/100`,
      '',
      'MARKET OVERVIEW',
      `Apps: ${report.marketData.totalApps}  |  Avg Rating: ${report.marketData.avgRating}★  |  Total Installs: ${fmtInstalls(report.marketData.totalInstalls)}  |  Weak Apps: ${report.marketData.weakAppsCount}`,
      '',
      'MARKET SUMMARY',
      report.marketSummary,
      '',
      'WHITESPACE OPPORTUNITY',
      report.whitespace,
      '',
      'DIFFERENTIATION ANGLES',
      ...(report.differentiationAngles || []).map(a => `• ${a}`),
      '',
      'REVENUE ESTIMATE',
      `Conservative: ${report.revenueEstimate?.conservative}`,
      `Optimistic: ${report.revenueEstimate?.optimistic}`,
      '',
      'RISKS',
      ...(report.risks || []).map(r => `• ${r}`),
      '',
      'GO-TO-MARKET TIP',
      report.goToMarketTip,
      '',
      'TOP KEYWORDS',
      ...(report.topKeywords || []).map(k => `${k.keyword} — Difficulty: ${k.difficulty}/100, Avg Rating: ${k.avgRating}★`),
      '',
      'TOP COMPETITORS',
      ...(report.topCompetitors || []).map(c => `${c.title} (${c.developer}) — ${c.score}★, ${c.reviews} reviews, ${c.installs || 'unknown'} installs`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-report-${report.niche.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const vc = report ? (VERDICT_CONFIG[report.verdict] || VERDICT_CONFIG.Caution) : null;

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Market Report"
        subtitle="One-click AI-powered market intelligence for any app niche"
      />

      {/* Input bar */}
      <div className="card mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <p className="section-label mb-1.5">App Niche</p>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g. meditation, habit tracker, budget planner, fitness coach…"
              className="input"
            />
          </div>
          <CountrySelect value={country} onChange={setCountry} />
          <button
            onClick={handleGenerate}
            disabled={loading || !niche.trim()}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <FileText size={15} />
            {loading ? 'Analyzing…' : 'Generate Report'}
          </button>
          {report && (
            <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5">
              <Download size={14} /> Export
            </button>
          )}
        </div>
      </div>

      {loading && (
        <LoadingState message="Fetching market data, analyzing competitors, generating insights…" />
      )}

      {report && (
        <div className="space-y-5 animate-fade-in">

          {/* Verdict + Score row */}
          <div className="grid grid-cols-3 gap-4">
            <div className={clsx('card col-span-2 flex items-start gap-4 border', vc.bg, vc.border)}>
              <vc.icon size={28} className={clsx('flex-shrink-0 mt-0.5', vc.text)} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', vc.badge)}>
                    {report.verdict}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(report.generatedAt).toLocaleDateString()} · {report.country.toUpperCase()}
                  </span>
                </div>
                <p className={clsx('font-semibold text-sm', vc.text)}>{report.verdictReason}</p>
              </div>
            </div>
            <div className="card flex flex-col items-center justify-center gap-1">
              <p className="section-label">Opportunity Score</p>
              <ScoreRing score={report.opportunityScore} />
            </div>
          </div>

          {/* Market stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Apps Found', value: report.marketData.totalApps, icon: Package },
              { label: 'Avg Rating', value: `${report.marketData.avgRating}★`, icon: Star },
              { label: 'Total Installs', value: fmtInstalls(report.marketData.totalInstalls), icon: Users },
              { label: 'Weak (<4★)', value: `${report.marketData.weakAppsCount} apps`, icon: BarChart2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card flex items-center gap-3">
                <Icon size={18} className="text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                  <p className="text-base font-bold text-slate-800">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Market summary */}
          <div className="card">
            <p className="section-label mb-2">Market Summary</p>
            <p className="text-sm text-slate-700 leading-relaxed">{report.marketSummary}</p>
          </div>

          {/* Whitespace + Angles + Revenue */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card">
              <p className="section-label mb-2">Whitespace Opportunity</p>
              <p className="text-sm text-slate-700 leading-relaxed">{report.whitespace}</p>
            </div>
            <div className="card">
              <p className="section-label mb-2">Differentiation Angles</p>
              <ul className="space-y-1.5">
                {(report.differentiationAngles || []).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 font-bold mt-0.5">·</span>{a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <p className="section-label mb-2">Revenue Estimate</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Conservative</p>
                  <p className="text-sm font-semibold text-slate-800">{report.revenueEstimate?.conservative}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Optimistic</p>
                  <p className="text-sm font-semibold text-emerald-700">{report.revenueEstimate?.optimistic}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Keywords + Risks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="section-label mb-3">Top Keywords</p>
              <div className="space-y-2.5">
                {(report.topKeywords || []).map(k => (
                  <div key={k.keyword}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-700">{k.keyword}</span>
                      <span className="text-[10px] text-slate-400">{k.avgRating}★ avg</span>
                    </div>
                    <DifficultyBar value={k.difficulty} />
                  </div>
                ))}
              </div>
              {report.topKeywordsInsight && (
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">{report.topKeywordsInsight}</p>
              )}
            </div>
            <div className="card">
              <p className="section-label mb-2">Risks & Challenges</p>
              <ul className="space-y-2 mb-4">
                {(report.risks || []).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-slate-100">
                <p className="section-label mb-1">Go-To-Market Tip</p>
                <p className="text-sm text-slate-700 leading-relaxed">{report.goToMarketTip}</p>
              </div>
            </div>
          </div>

          {/* Competitors */}
          <div className="card">
            <p className="section-label mb-3">Top Competitors</p>
            <div className="space-y-3">
              {(report.topCompetitors || []).map((app, i) => (
                <div key={app.appId} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="flex-shrink-0 w-5 text-center text-xs font-bold text-slate-400 mt-2.5">
                    {i + 1}
                  </div>
                  {app.icon && (
                    <img src={app.icon} alt={app.title} className="w-9 h-9 rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800">{app.title}</span>
                      <span className="text-[11px] text-slate-400">{app.developer}</span>
                      <span className="text-xs font-semibold text-amber-600">{app.score}★</span>
                      <span className="text-xs text-slate-400">{app.reviews?.toLocaleString()} reviews</span>
                      <span className="text-xs text-slate-400">{app.installs || '—'}</span>
                    </div>
                    {app.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{app.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Re-run */}
          <button
            onClick={handleGenerate}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={13} /> Regenerate Report
          </button>

        </div>
      )}
    </div>
  );
}
