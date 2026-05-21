import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Lightbulb, TrendingUp, Zap, BarChart2, Target } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const handleCTA = () => navigate('/app');

  const features = [
    { icon: Search, title: 'Keyword Intelligence', desc: '100+ keywords from any niche using Play Store + App Store autocomplete with difficulty scoring.' },
    { icon: TrendingUp, title: 'Niche Opportunities', desc: 'Scan 40+ categories and rank them by opportunity score based on competition and user satisfaction.' },
    { icon: BarChart2, title: 'Competitor Deep Dive', desc: 'Full metadata, reviews, update history, and similar apps for any app on both platforms.' },
    { icon: Lightbulb, title: 'AI Gap Analyzer', desc: 'Claude reads 150 competitor reviews and extracts user pain points, missing features, and gaps.' },
    { icon: Target, title: 'App Idea Generator', desc: 'Get 3 fully scoped app ideas with features, monetization, ASO keywords, and build timeline.' },
    { icon: Zap, title: 'ASO Optimizer', desc: 'Optimize your title, description, and keywords for maximum discoverability on both stores.' },
  ];

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-ink-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-acid rounded-lg flex items-center justify-center">
            <span className="font-display font-800 text-ink-900 text-xs">AN</span>
          </div>
          <span className="font-display font-700 text-ink-50">AppNiche</span>
        </div>
        <button onClick={handleCTA} className="btn-primary flex items-center gap-2">
          Get Started
          <ArrowRight size={14} />
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-acid/10 border border-acid/20 text-acid text-xs font-mono px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-acid rounded-full animate-pulse" />
          Free. No subscription required.
        </div>

        <h1 className="font-display text-5xl font-800 text-ink-50 leading-tight mb-6">
          Find what to build next.<br />
          <span className="text-gradient">Before your competitors do.</span>
        </h1>

        <p className="text-lg text-ink-400 max-w-xl mx-auto mb-10 leading-relaxed">
          App market intelligence powered by real store data. Keyword research, gap analysis, competitor insights, and AI-generated app ideas — all in one place.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button onClick={handleCTA} className="btn-primary flex items-center gap-2 px-6 py-3 text-base">
            Start for free
            <ArrowRight size={16} />
          </button>
          <span className="text-sm text-ink-500">No credit card. No API key needed.</span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <p className="section-label text-center mb-10">What you get</p>
        <div className="grid grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card group hover:border-ink-500 transition-all">
              <div className="w-8 h-8 bg-acid/10 rounded-lg flex items-center justify-center mb-4">
                <Icon size={15} className="text-acid" />
              </div>
              <h3 className="font-display font-600 text-ink-100 mb-2 text-sm">{title}</h3>
              <p className="text-xs text-ink-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-ink-800 py-16 text-center">
        <h2 className="font-display text-3xl font-700 text-ink-50 mb-4">Ready to find your next app?</h2>
        <p className="text-ink-400 mb-8">Join developers and founders using real data to build better apps.</p>
        <button onClick={handleCTA} className="btn-primary px-8 py-3 text-base">
          Start for free →
        </button>
      </section>
    </div>
  );
}
