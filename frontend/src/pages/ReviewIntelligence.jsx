import { useState } from 'react';
import { analysisAPI, appsAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { PageHeader, CountrySelect, LoadingState } from '../components/UI.jsx';
import {
  MessageSquare, TrendingDown, TrendingUp, Lightbulb,
  AlertCircle, CheckCircle2, Star, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SENTIMENT_COLOR = {
  positive: 'text-emerald-600 bg-emerald-50',
  negative: 'text-red-600 bg-red-50',
  mixed:    'text-amber-600 bg-amber-50',
};

const FREQ_WIDTH = { high: 'w-full', medium: 'w-2/3', low: 'w-1/3' };
const FREQ_COLOR = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-300' };

function SentimentMeter({ score }) {
  const color = score >= 65 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700">{score}/100</span>
    </div>
  );
}

function TagCard({ tag }) {
  const [open, setOpen] = useState(false);
  const sentimentCls = SENTIMENT_COLOR[tag.sentiment] || SENTIMENT_COLOR.mixed;
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-800">{tag.tag}</span>
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', sentimentCls)}>
              {tag.sentiment}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={clsx('h-1.5 rounded-full bg-slate-200 w-32 overflow-hidden')}>
              <div
                className={clsx('h-full rounded-full', tag.sentiment === 'positive' ? 'bg-emerald-400' : tag.sentiment === 'negative' ? 'bg-red-400' : 'bg-amber-400')}
                style={{ width: `${tag.pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{tag.pct}% of reviews · {tag.count} mentions</span>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
          <p className="text-sm text-slate-600">{tag.summary}</p>
          {(tag.topQuotes || []).map((q, i) => (
            <blockquote key={i} className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3">
              "{q}"
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewIntelligence() {
  const { country, setCountry } = useSettings();
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('android');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [intel, setIntel] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedApp(null);
    setIntel(null);
    try {
      const results = await appsAPI.search(query.trim(), platform, country, 8);
      setSearchResults(results || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAnalyze = async (app) => {
    setSelectedApp(app);
    setSearchResults([]);
    setLoading(true);
    setIntel(null);
    try {
      const data = await analysisAPI.reviewIntelligence(app.appId, platform, country);
      setIntel(data);
    } catch (e) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Review Intelligence"
        subtitle="AI breaks down any app's reviews into feature-level insights — see exactly what users love, hate, and want"
      />

      {/* Search bar */}
      <div className="card mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <p className="section-label mb-1.5">Search App</p>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="App name or ID (e.g. Calm, com.calm.android)"
              className="input"
            />
          </div>
          <div>
            <p className="section-label mb-1.5">Platform</p>
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
      </div>

      {/* Search results picker */}
      {searchResults.length > 0 && (
        <div className="card mb-6">
          <p className="section-label mb-3">Select an app to analyze</p>
          <div className="space-y-2">
            {searchResults.map(app => (
              <button
                key={app.appId}
                onClick={() => handleAnalyze(app)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
              >
                {app.icon && <img src={app.icon} className="w-10 h-10 rounded-xl flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{app.title}</p>
                  <p className="text-xs text-slate-400">{app.developer} · {app.score}★ · {app.reviews?.toLocaleString()} reviews</p>
                </div>
                <span className="text-xs text-blue-600 font-semibold flex-shrink-0">Analyze →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected app header */}
      {selectedApp && !loading && intel && (
        <div className="flex items-center gap-3 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
          {selectedApp.icon && <img src={selectedApp.icon} className="w-12 h-12 rounded-xl" />}
          <div>
            <p className="font-bold text-slate-800">{intel.appName}</p>
            <p className="text-xs text-slate-500">{intel.appScore}★ · {intel.appReviews?.toLocaleString()} reviews · {intel.analyzedAt ? new Date(intel.analyzedAt).toLocaleDateString() : ''}</p>
          </div>
          <button onClick={() => { setIntel(null); setSelectedApp(null); }} className="ml-auto btn-secondary text-xs">
            Analyze Different App
          </button>
        </div>
      )}

      {loading && (
        <LoadingState message={`Fetching up to 500 reviews and running AI analysis on ${selectedApp?.title}…`} />
      )}

      {intel && (
        <div className="space-y-5 animate-fade-in">

          {/* Sentiment overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card col-span-2">
              <p className="section-label mb-3">Executive Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{intel.executiveSummary}</p>
              <div className="mt-4">
                <div className="flex justify-between mb-1.5">
                  <p className="section-label">Overall Sentiment</p>
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', SENTIMENT_COLOR[intel.overallSentiment])}>
                    {intel.overallSentiment}
                  </span>
                </div>
                <SentimentMeter score={intel.sentimentScore || 0} />
              </div>
            </div>
            <div className="card">
              <p className="section-label mb-2">Reviews Analyzed</p>
              <p className="text-4xl font-bold text-blue-600 mb-1">{intel.totalAnalyzed}</p>
              <p className="text-xs text-slate-500">of up to 500 recent reviews</p>
            </div>
          </div>

          {/* Feature tag breakdown */}
          <div>
            <p className="section-label mb-3">Feature Tag Breakdown</p>
            <div className="space-y-2">
              {(intel.featureTags || [])
                .sort((a, b) => b.count - a.count)
                .map(tag => <TagCard key={tag.tag} tag={tag} />)
              }
            </div>
          </div>

          {/* Complaints + Praises */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-red-500" />
                <p className="section-label">Top Complaints</p>
              </div>
              <div className="space-y-3">
                {(intel.topComplaints || []).map((c, i) => (
                  <div key={i} className="pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-800">{c.issue}</p>
                      <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                        c.impactOnRating === 'high' ? 'bg-red-100 text-red-700' :
                        c.impactOnRating === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {c.impactOnRating} impact
                      </span>
                    </div>
                    <div className={clsx('h-1 rounded-full bg-slate-100 mb-2 overflow-hidden', FREQ_WIDTH[c.frequency])}>
                      <div className={clsx('h-full rounded-full', FREQ_COLOR[c.frequency])} style={{ width: '100%' }} />
                    </div>
                    {c.quote && (
                      <p className="text-xs text-slate-500 italic">"{c.quote.slice(0, 100)}…"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-emerald-500" />
                <p className="section-label">Top Praises</p>
              </div>
              <div className="space-y-3">
                {(intel.topPraises || []).map((p, i) => (
                  <div key={i} className="pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-slate-800 mb-1">{p.strength}</p>
                    <div className={clsx('h-1 rounded-full bg-slate-100 mb-2 overflow-hidden', FREQ_WIDTH[p.frequency])}>
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: '100%' }} />
                    </div>
                    {p.quote && (
                      <p className="text-xs text-slate-500 italic">"{p.quote.slice(0, 100)}…"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature requests + Competitive opportunity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-blue-500" />
                <p className="section-label">Feature Requests</p>
              </div>
              <div className="space-y-2">
                {(intel.featureRequests || []).map((fr, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{fr.feature}</p>
                      <p className="text-[11px] text-slate-400">{fr.requestCount} requests</p>
                    </div>
                    <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      fr.businessValue === 'high' ? 'bg-blue-100 text-blue-700' :
                      fr.businessValue === 'medium' ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'
                    )}>
                      {fr.businessValue} value
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-amber-500" />
                <p className="section-label">Competitive Opportunity</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{intel.competitiveOpportunity}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
