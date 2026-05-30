import { useState } from 'react';
import { analysisAPI } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { PageHeader, CountrySelect, LoadingState } from '../components/UI.jsx';
import {
  CheckCircle, AlertTriangle, XCircle, Rocket, Clock,
  DollarSign, Target, Shield, Zap, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const VERDICT_CONFIG = {
  Go:     { icon: CheckCircle,   bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', bar: 'bg-emerald-400' },
  Caution:{ icon: AlertTriangle, bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   bar: 'bg-amber-400' },
  Avoid:  { icon: XCircle,       bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     bar: 'bg-red-400' },
};

function ScoreBar({ value, label, color = 'bg-blue-400' }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-bold text-slate-700">{value}/100</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const DIFF_COLOR = { low: 'bg-emerald-100 text-emerald-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700' };
const KWDIFF_COLOR = (d) => d < 40 ? 'bg-emerald-100 text-emerald-700' : d < 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

const EXAMPLES = [
  'A habit tracker for ADHD adults that uses body-doubling sessions and time-blindness tools',
  'A budget app specifically for freelancers that handles irregular income and tax estimates automatically',
  'A sleep app for parents of newborns with micro-nap recommendations and feeding schedule integration',
  'A meditation app for corporate teams with 5-minute guided sessions and Slack integration',
];

export default function IdeaValidator() {
  const { country, setCountry } = useSettings();
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleValidate = async () => {
    if (!idea.trim()) { toast.error('Describe your app idea first'); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await analysisAPI.validateIdea(idea.trim(), country);
      setResult(data);
    } catch (e) {
      toast.error(e.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const vc = result ? (VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.Caution) : null;

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader
        title="Idea Validator"
        subtitle="Describe your app idea and get a market-backed Go / Caution / Avoid verdict in under 60 seconds"
      />

      {/* Input */}
      <div className="card mb-6">
        <p className="section-label mb-2">Your App Idea</p>
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="Describe your app idea in 1-3 sentences. The more specific, the better the analysis…"
          className="input h-24 resize-none mb-3"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <CountrySelect value={country} onChange={setCountry} />
          <button
            onClick={handleValidate}
            disabled={loading || !idea.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Zap size={14} />
            {loading ? 'Validating…' : 'Validate Idea'}
          </button>
          <span className="text-xs text-slate-400">or try an example:</span>
          {EXAMPLES.slice(0, 2).map((ex, i) => (
            <button
              key={i}
              onClick={() => setIdea(ex)}
              className="text-xs text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline truncate max-w-48"
            >
              "{ex.slice(0, 45)}…"
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <LoadingState message="Extracting keywords → searching app stores → analyzing market → generating verdict…" />
      )}

      {result && (
        <div className="space-y-5 animate-fade-in">

          {/* Main verdict */}
          <div className={clsx('card border-2 flex items-start gap-5', vc.bg, vc.border)}>
            <vc.icon size={40} className={clsx('flex-shrink-0', vc.text)} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className={clsx('text-2xl font-bold', vc.text)}>{result.verdict}</h2>
                <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden max-w-32">
                  <div className={clsx('h-full rounded-full', vc.bar)} style={{ width: `${result.verdictScore}%` }} />
                </div>
                <span className={clsx('text-sm font-bold', vc.text)}>{result.verdictScore}/100</span>
              </div>
              <p className={clsx('text-sm leading-relaxed', vc.text)}>{result.verdictReason}</p>
            </div>
          </div>

          {/* Scores row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card space-y-3">
              <ScoreBar value={result.uniquenessScore} label="Uniqueness Score" color="bg-blue-400" />
              <p className="text-xs text-slate-500">{result.uniquenessReason}</p>
            </div>
            <div className="card grid grid-cols-2 gap-3">
              {[
                { label: 'Market Fit',      value: result.marketFit,      colorMap: { high: 'text-emerald-600 bg-emerald-50', medium: 'text-amber-600 bg-amber-50', low: 'text-red-600 bg-red-50' } },
                { label: 'Build Difficulty',value: result.buildDifficulty, colorMap: DIFF_COLOR },
              ].map(({ label, value, colorMap }) => (
                <div key={label}>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">{label}</p>
                  <span className={clsx('text-sm font-bold px-2 py-1 rounded-lg capitalize', colorMap[value] || 'bg-slate-100 text-slate-700')}>
                    {value}
                  </span>
                </div>
              ))}
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">Time to Revenue</p>
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                  <Clock size={13} className="text-blue-500" />{result.timeToRevenue}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">Market Apps Found</p>
                <p className="text-sm font-bold text-slate-700">{result.marketData?.totalApps}</p>
              </div>
            </div>
          </div>

          {/* Target + Monetization + Winning angle */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={13} className="text-blue-500" />
                <p className="section-label">Target Audience</p>
              </div>
              <p className="text-sm text-slate-700">{result.targetAudience}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign size={13} className="text-emerald-500" />
                <p className="section-label">Monetization</p>
              </div>
              <p className="text-sm text-slate-700">{result.monetizationSuggestion}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-1.5 mb-2">
                <Rocket size={13} className="text-purple-500" />
                <p className="section-label">Winning Angle</p>
              </div>
              <p className="text-sm text-slate-700">{result.winningAngle}</p>
            </div>
          </div>

          {/* Revenue + Risk */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="section-label mb-3">Revenue Estimate</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Conservative</p>
                  <p className="font-bold text-slate-800">{result.estimatedRevenue?.conservative}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase">Optimistic</p>
                  <p className="font-bold text-emerald-700">{result.estimatedRevenue?.optimistic}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield size={13} className="text-amber-500" />
                <p className="section-label">Biggest Risk</p>
              </div>
              <p className="text-sm text-slate-700">{result.biggestRisk}</p>
            </div>
          </div>

          {/* MVP scope */}
          <div className="card">
            <p className="section-label mb-3">Recommended MVP Scope</p>
            <div className="flex flex-wrap gap-2">
              {(result.mvpScope || []).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                  <CheckCircle size={11} className="text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords + Competitors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="section-label mb-3">Keywords Analyzed</p>
              <div className="space-y-2">
                {(result.kwDifficulties || []).map(k => (
                  <div key={k.keyword} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{k.keyword}</span>
                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', KWDIFF_COLOR(k.difficulty))}>
                      {k.difficulty < 40 ? 'Easy' : k.difficulty < 70 ? 'Medium' : 'Hard'} {k.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <p className="section-label mb-3">Top Competing Apps</p>
              <div className="space-y-2">
                {(result.topCompetitors || []).map(app => (
                  <div key={app.appId} className="flex items-center gap-2">
                    {app.icon && <img src={app.icon} className="w-7 h-7 rounded-lg flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{app.title}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs text-amber-600 font-semibold flex-shrink-0">
                      <Star size={10} />{app.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
