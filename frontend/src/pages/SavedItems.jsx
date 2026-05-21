import { useState, useEffect } from 'react';
import { dbOps } from '../lib/db.js';
import { PageHeader, TabBar, LoadingState, EmptyState, Stars } from '../components/UI.jsx';
import { Bookmark, Trash2, Search, Smartphone, Lightbulb, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SavedItems() {
  const [tab, setTab] = useState('ideas');
  const [searches, setSearches] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dbOps.getSearches(),
      dbOps.getAnalyses(),
      dbOps.getIdeas(),
      dbOps.getTrackedApps()
    ]).then(([s, a, i, t]) => {
      setSearches(s); setAnalyses(a); setIdeas(i); setTracked(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const del = async (type, id, setter) => {
    try {
      if (type === 'search') await dbOps.deleteSearch(null, id);
      else if (type === 'idea') await dbOps.deleteIdea(null, id);
      else if (type === 'tracked') await dbOps.untrackApp(null, id.split('_')[1], id.split('_')[0]);
      setter(prev => prev.filter(x => x.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const tabs = [
    { id: 'ideas', label: 'App Ideas', count: ideas.length },
    { id: 'analyses', label: 'Gap Analyses', count: analyses.length },
    { id: 'tracked', label: 'Tracked Apps', count: tracked.length },
    { id: 'searches', label: 'Saved Searches', count: searches.length },
  ];

  if (loading) return <div className="p-8"><LoadingState /></div>;

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Saved Items" subtitle="Your research library" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'ideas' && (
        ideas.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No saved ideas yet" subtitle="Generate ideas in the Idea Generator and save them here" />
        ) : (
          <div className="space-y-4">
            {ideas.map(item => (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-600 text-ink-100">{item.idea?.name}</p>
                    <p className="text-xs text-acid">{item.idea?.tagline}</p>
                    <p className="text-xs text-ink-500 mt-1">Niche: {item.niche}</p>
                  </div>
                  <button onClick={() => del('idea', item.id, setIdeas)}>
                    <Trash2 size={13} className="text-ink-600 hover:text-red-400" />
                  </button>
                </div>
                <p className="text-sm text-ink-400 mb-3">{item.idea?.concept}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.idea?.asoKeywords?.slice(0,5).map(k => (
                    <span key={k} className="badge-acid text-xs">{k}</span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-ink-700">
                  <div>
                    <p className="text-xs text-ink-500">Revenue Est.</p>
                    <p className="text-xs text-green-400">{item.idea?.revenueEstimate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Time to MVP</p>
                    <p className="text-xs text-ink-300">{item.idea?.timeToMVP}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Complexity</p>
                    <p className="text-xs text-ink-300">{item.idea?.buildComplexity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'analyses' && (
        analyses.length === 0 ? (
          <EmptyState icon={BarChart2} title="No analyses saved" subtitle="Run gap analysis on apps to save results here" />
        ) : (
          <div className="space-y-4">
            {analyses.map(a => (
              <div key={a.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-ink-100">{a.appTitle}</p>
                    <p className="text-xs text-ink-500">{a.platform} · Gap Score: <span className="text-acid">{a.gapScore}</span></p>
                  </div>
                  <span className={clsx('badge', a.overallSentiment === 'positive' ? 'badge-green' : a.overallSentiment === 'negative' ? 'badge-red' : 'badge-yellow')}>
                    {a.overallSentiment}
                  </span>
                </div>
                {a.summary && <p className="text-sm text-ink-400 mb-3">{a.summary}</p>}
                {a.topComplaints?.length > 0 && (
                  <div>
                    <p className="text-xs text-ink-500 mb-2">Top complaints:</p>
                    <div className="space-y-1">
                      {a.topComplaints.slice(0,3).map((c, i) => (
                        <p key={i} className="text-xs text-ink-400">· {c.issue}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'tracked' && (
        tracked.length === 0 ? (
          <EmptyState icon={Smartphone} title="No tracked apps" subtitle="Track apps from the App Analyzer to monitor them here" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tracked.map(app => (
              <div key={app.id} className="card flex items-center gap-3">
                <img src={app.icon} className="w-10 h-10 rounded-xl" alt={app.title}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${app.title}&background=2a2a27&color=a8a8a2&size=40`; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-100 truncate">{app.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-yellow-400 text-xs">★</span>
                    <span className="text-xs text-ink-400">{app.score?.toFixed(1)}</span>
                    <span className="text-xs text-ink-600 ml-1">{app.platform}</span>
                  </div>
                </div>
                <button onClick={() => del('tracked', app.id, setTracked)}>
                  <Trash2 size={12} className="text-ink-600 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'searches' && (
        searches.length === 0 ? (
          <EmptyState icon={Search} title="No saved searches" subtitle="Save keyword searches from the Keyword Research page" />
        ) : (
          <div className="space-y-3">
            {searches.map(s => (
              <div key={s.id} className="card flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-100 mb-1">"{s.query}"</p>
                  <p className="text-xs text-ink-500 mb-2">{s.total} keywords · {s.country?.toUpperCase()}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.keywords?.slice(0, 8).map(k => (
                      <span key={k} className="text-xs bg-ink-700 text-ink-400 px-2 py-0.5 rounded">{k}</span>
                    ))}
                    {s.keywords?.length > 8 && (
                      <span className="text-xs text-ink-600">+{s.keywords.length - 8} more</span>
                    )}
                  </div>
                </div>
                <button onClick={() => del('search', s.id, setSearches)}>
                  <Trash2 size={12} className="text-ink-600 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
