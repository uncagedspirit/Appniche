import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbOps } from '../lib/db.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { nichesAPI } from '../lib/api.js';
import { PageHeader, StatCard, LoadingState, ScoreRing } from '../components/UI.jsx';
import { Search, Compass, Smartphone, Lightbulb, Zap, Bookmark, ArrowRight, TrendingUp } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Research Keywords', desc: 'Find keywords for your niche', icon: Search, to: '/app/keywords', color: 'text-blue-400' },
  { label: 'Explore Niches', desc: 'Find underserved categories', icon: Compass, to: '/app/niches', color: 'text-purple-400' },
  { label: 'Analyze an App', desc: 'Deep dive into any app', icon: Smartphone, to: '/app/analyzer', color: 'text-orange-400' },
  { label: 'Generate Ideas', desc: 'AI-powered app ideas', icon: Lightbulb, to: '/app/ideas', color: 'text-acid' },
  { label: 'Optimize ASO', desc: 'Improve discoverability', icon: Zap, to: '/app/aso', color: 'text-green-400' },
  { label: 'Saved Items', desc: 'View your collections', icon: Bookmark, to: '/app/saved', color: 'text-pink-400' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { country } = useSettings();
  const [stats, setStats] = useState({ searches: 0, analyses: 0, ideas: 0, tracked: 0 });
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpp, setLoadingOpp] = useState(true);

  useEffect(() => {
    Promise.all([
      dbOps.getSearches(),
      dbOps.getAnalyses(),
      dbOps.getIdeas(),
      dbOps.getTrackedApps()
    ]).then(([searches, analyses, ideas, tracked]) => {
      setStats({ searches: searches.length, analyses: analyses.length, ideas: ideas.length, tracked: tracked.length });
    }).catch(() => {});

    setLoadingOpp(true);
    nichesAPI.opportunities(country)
      .then(data => setOpportunities(data?.slice(0, 6) || []))
      .catch(() => {})
      .finally(() => setLoadingOpp(false));
  }, [country]);


  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-700 text-ink-50">Dashboard</h1>
        <p className="text-sm text-ink-400 mt-1">Here's your app intelligence overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Searches" value={stats.searches} sub="keyword searches" />
        <StatCard label="Analyses" value={stats.analyses} sub="gap analyses run" />
        <StatCard label="Ideas Saved" value={stats.ideas} sub="app ideas generated" accent />
        <StatCard label="Tracked Apps" value={stats.tracked} sub="apps being tracked" />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <p className="section-label mb-4">Quick Actions</p>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(({ label, desc, icon: Icon, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="card text-left hover:border-ink-500 transition-all group flex items-start gap-3"
            >
              <Icon size={16} className={color} />
              <div>
                <p className="text-sm font-medium text-ink-100">{label}</p>
                <p className="text-xs text-ink-500 mt-0.5">{desc}</p>
              </div>
              <ArrowRight size={13} className="ml-auto text-ink-600 group-hover:text-ink-400 transition-colors mt-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Top Opportunities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="section-label flex items-center gap-2">
            <TrendingUp size={12} />
            Top Opportunities Right Now
          </p>
          <button onClick={() => navigate('/app/niches')} className="text-xs text-acid hover:underline">
            View all →
          </button>
        </div>

        {loadingOpp ? (
          <LoadingState message="Scanning market opportunities..." />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {opportunities.map(opp => (
              <button
                key={opp.category}
                onClick={() => navigate(`/app/niches?cat=${opp.category}`)}
                className="card text-left hover:border-ink-500 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-ink-100">{opp.name}</p>
                  <ScoreRing score={opp.opportunityScore} size="sm" />
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-500">
                  <span>Avg rating: <span className="text-yellow-400">{opp.avgRating}★</span></span>
                  <span>{opp.lowRatedCount} weak apps</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
