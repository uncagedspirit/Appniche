import { useState } from 'react';
import { analysisAPI, keywordsAPI } from '../lib/api.js';
import { dbOps } from '../lib/db.js';
import { PageHeader, CountrySelect, LoadingState } from '../components/UI.jsx';
import { Lightbulb, Save, Plus, X, Sparkles, Clock, DollarSign, Layers, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function IdeaGenerator() {
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('us');
  const [gaps, setGaps] = useState([]);
  const [gapInput, setGapInput] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState('');
  const [competitors, setCompetitors] = useState([]);
  const [compInput, setCompInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingKw, setFetchingKw] = useState(false);
  const [ideas, setIdeas] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  const addItem = (list, setList, input, setInput) => {
    if (!input.trim()) return;
    setList(prev => [...prev, input.trim()]);
    setInput('');
  };
  const removeItem = (list, setList, i) => setList(prev => prev.filter((_, idx) => idx !== i));

  const fetchKeywords = async () => {
    if (!niche.trim()) return;
    setFetchingKw(true);
    try {
      const data = await keywordsAPI.suggest(niche, country);
      setKeywords(data.combined?.slice(0, 15) || []);
    } catch { toast.error('Failed to fetch keywords'); }
    finally { setFetchingKw(false); }
  };

  const handleGenerate = async () => {
    if (!niche.trim()) { toast.error('Enter a niche first'); return; }
    setLoading(true);
    try {
      const data = await analysisAPI.idea(niche, gaps, keywords, competitors, country);
      setIdeas(data.ideas || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async (idea, idx) => {
    try {
      await dbOps.saveIdea(null, { niche, idea, country, savedAt: new Date().toISOString() });
      setSavedIds(prev => new Set([...prev, idx]));
      toast.success('Idea saved!');
    } catch { toast.error('Failed to save'); }
  };

  const complexityColor = (c) =>
    c === 'low' ? 'badge-green' : c === 'medium' ? 'badge-yellow' : 'badge-red';

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Idea Generator" subtitle="AI generates app ideas based on real market gaps and keywords" />

      <div className="grid grid-cols-5 gap-6">
        {/* Input panel */}
        <div className="col-span-2 space-y-4">
          <div className="card">
            <p className="section-label mb-3">1. Your Niche</p>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. habit tracking, meditation, budget"
              className="input"
            />
            <div className="flex gap-2 mt-2">
              <CountrySelect value={country} onChange={setCountry} />
              <button onClick={fetchKeywords} className="btn-secondary text-xs flex-1" disabled={fetchingKw || !niche.trim()}>
                {fetchingKw ? 'Fetching...' : '+ Auto-fill keywords'}
              </button>
            </div>
          </div>

          <div className="card">
            <p className="section-label mb-3">2. Known Gaps (optional)</p>
            <p className="text-xs text-ink-500 mb-2">Add pain points you've found in competitor reviews</p>
            <div className="flex gap-2 mb-2">
              <input
                value={gapInput}
                onChange={e => setGapInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem(gaps, setGaps, gapInput, setGapInput)}
                placeholder="e.g. no offline mode"
                className="input text-xs"
              />
              <button onClick={() => addItem(gaps, setGaps, gapInput, setGapInput)} className="btn-secondary px-3">
                <Plus size={13} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gaps.map((g, i) => (
                <div key={i} className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs">
                  {g}
                  <button onClick={() => removeItem(gaps, setGaps, i)}><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="section-label mb-3">3. Target Keywords</p>
            <div className="flex gap-2 mb-2">
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem(keywords, setKeywords, kwInput, setKwInput)}
                placeholder="e.g. daily habit tracker"
                className="input text-xs"
              />
              <button onClick={() => addItem(keywords, setKeywords, kwInput, setKwInput)} className="btn-secondary px-3">
                <Plus size={13} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs">
                  {k}
                  <button onClick={() => removeItem(keywords, setKeywords, i)}><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="section-label mb-3">4. Competitors (optional)</p>
            <div className="flex gap-2 mb-2">
              <input
                value={compInput}
                onChange={e => setCompInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem(competitors, setCompetitors, compInput, setCompInput)}
                placeholder="e.g. Habitica, Streaks"
                className="input text-xs"
              />
              <button onClick={() => addItem(competitors, setCompetitors, compInput, setCompInput)} className="btn-secondary px-3">
                <Plus size={13} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {competitors.map((c, i) => (
                <div key={i} className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-1 rounded-lg text-xs">
                  {c}
                  <button onClick={() => removeItem(competitors, setCompetitors, i)}><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} className="btn-primary w-full flex items-center justify-center gap-2 py-3" disabled={loading || !niche.trim()}>
            <Sparkles size={15} />
            {loading ? 'Generating Ideas...' : 'Generate App Ideas'}
          </button>
        </div>

        {/* Ideas output */}
        <div className="col-span-3">
          {loading ? (
            <LoadingState message="Claude is thinking of your next big app idea..." />
          ) : ideas ? (
            <div className="space-y-5">
              {ideas.map((idea, idx) => (
                <div key={idx} className="card border-ink-600">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-700 text-ink-50">{idea.name}</h3>
                      <p className="text-sm text-acid mt-0.5">{idea.tagline}</p>
                    </div>
                    <button
                      onClick={() => handleSave(idea, idx)}
                      disabled={savedIds.has(idx)}
                      className={clsx('btn-secondary text-xs flex items-center gap-1', savedIds.has(idx) && 'opacity-50')}
                    >
                      <Save size={11} />
                      {savedIds.has(idx) ? 'Saved' : 'Save'}
                    </button>
                  </div>

                  <p className="text-sm text-ink-300 mb-4">{idea.concept}</p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers size={12} className="text-ink-500" />
                      <div>
                        <p className="text-xs text-ink-500">Complexity</p>
                        <span className={clsx('badge text-xs', complexityColor(idea.buildComplexity))}>{idea.buildComplexity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-ink-500" />
                      <div>
                        <p className="text-xs text-ink-500">Time to MVP</p>
                        <p className="text-xs font-medium text-ink-200">{idea.timeToMVP}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={12} className="text-ink-500" />
                      <div>
                        <p className="text-xs text-ink-500">Est. Revenue</p>
                        <p className="text-xs font-medium text-green-400">{idea.revenueEstimate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-ink-500 mb-2">Core Features</p>
                      <ul className="space-y-1">
                        {idea.coreFeatures?.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-ink-300">
                            <span className="text-acid mt-0.5">·</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 mb-2">MVP Features</p>
                      <ul className="space-y-1">
                        {idea.mvpFeatures?.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-ink-300">
                            <span className="text-blue-400 mt-0.5">·</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="border-t border-ink-700 pt-4 space-y-3">
                    <div>
                      <p className="text-xs text-ink-500 mb-1">Target Audience</p>
                      <p className="text-xs text-ink-300">{idea.targetAudience}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 mb-1">Unique Angle</p>
                      <p className="text-xs text-acid">{idea.uniqueAngle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 mb-1">Monetization</p>
                      <p className="text-xs text-ink-300">{idea.monetization}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 mb-2">ASO Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {idea.asoKeywords?.map(k => (
                          <span key={k} className="badge-acid text-xs">{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Lightbulb size={32} className="text-ink-700 mx-auto mb-4" />
                <p className="text-ink-400 text-sm">Fill in your niche and click Generate</p>
                <p className="text-xs text-ink-600 mt-1">The more gaps and keywords you add, the better the ideas</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
