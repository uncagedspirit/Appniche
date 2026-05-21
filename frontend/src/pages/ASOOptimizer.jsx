import { useState } from 'react';
import { analysisAPI } from '../lib/api.js';
import { PageHeader, PlatformToggle, LoadingState } from '../components/UI.jsx';
import { Zap, Copy, Check, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ASOOptimizer() {
  const [platform, setPlatform] = useState('android');
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [kwInput, setKwInput] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState({});

  const addKw = () => {
    if (!kwInput.trim()) return;
    setKeywords(prev => [...prev, kwInput.trim()]);
    setKwInput('');
  };

  const handleOptimize = async () => {
    if (!appName.trim()) { toast.error('Enter app name'); return; }
    setLoading(true);
    try {
      const data = await analysisAPI.asoOptimize(appName, description, keywords, category, platform);
      setResult(data);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
    toast.success('Copied!');
  };

  const CopyBtn = ({ id, text }) => (
    <button onClick={() => copyText(id, text)} className="text-ink-500 hover:text-ink-300 transition-colors">
      {copied[id] ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="ASO Optimizer" subtitle="Optimize your app's metadata for maximum discoverability" />

      <div className="grid grid-cols-5 gap-6">
        {/* Input */}
        <div className="col-span-2 space-y-4">
          <div className="card">
            <p className="section-label mb-4">App Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-500 mb-1 block">Platform</label>
                <PlatformToggle value={platform} onChange={setPlatform} />
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1 block">App Name *</label>
                <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="Your App Name" className="input" />
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1 block">Category</label>
                <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Health & Fitness" className="input" />
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1 block">Current Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Paste your current description..."
                  className="input resize-none h-28 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <p className="section-label mb-3">Target Keywords</p>
            <div className="flex gap-2 mb-3">
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKw()}
                placeholder="Add keyword"
                className="input text-xs"
              />
              <button onClick={addKw} className="btn-secondary px-3"><Plus size={13} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs">
                  {k}
                  <button onClick={() => setKeywords(p => p.filter((_, j) => j !== i))}><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleOptimize} className="btn-primary w-full py-3 flex items-center justify-center gap-2" disabled={loading}>
            <Zap size={15} />
            {loading ? 'Optimizing...' : 'Optimize ASO'}
          </button>
        </div>

        {/* Result */}
        <div className="col-span-3">
          {loading ? (
            <LoadingState message="Claude is crafting your optimized metadata..." />
          ) : result ? (
            <div className="space-y-4">
              {/* Title */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Optimized Title</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-500">{result.optimizedTitle?.length}/30</span>
                    <CopyBtn id="title" text={result.optimizedTitle} />
                  </div>
                </div>
                <p className="text-base font-display font-600 text-ink-50">{result.optimizedTitle}</p>
              </div>

              {/* Subtitle */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Subtitle / Short Description</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-500">{result.optimizedSubtitle?.length}/80</span>
                    <CopyBtn id="subtitle" text={result.optimizedSubtitle} />
                  </div>
                </div>
                <p className="text-sm text-ink-300">{result.optimizedSubtitle}</p>
              </div>

              {/* Short desc (Android) */}
              {platform === 'android' && result.shortDescription && (
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="section-label">Play Store Short Description</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-500">{result.shortDescription?.length}/80</span>
                      <CopyBtn id="short" text={result.shortDescription} />
                    </div>
                  </div>
                  <p className="text-sm text-ink-300">{result.shortDescription}</p>
                </div>
              )}

              {/* iOS keyword field */}
              {platform === 'ios' && result.iosKeywordField && (
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="section-label">iOS Keyword Field</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-500">{result.iosKeywordField?.length}/100</span>
                      <CopyBtn id="ios_kw" text={result.iosKeywordField} />
                    </div>
                  </div>
                  <p className="text-xs font-mono text-ink-300">{result.iosKeywordField}</p>
                </div>
              )}

              {/* Full description */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Full Description</p>
                  <CopyBtn id="desc" text={result.optimizedDescription} />
                </div>
                <p className="text-sm text-ink-300 whitespace-pre-line max-h-64 overflow-y-auto">
                  {result.optimizedDescription}
                </p>
              </div>

              {/* Keywords */}
              <div className="card">
                <p className="section-label mb-3">Primary Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.primaryKeywords?.map(k => (
                    <span key={k} className="badge-acid">{k}</span>
                  ))}
                </div>
              </div>
              <div className="card">
                <p className="section-label mb-3">Long-tail Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.longTailKeywords?.map(k => (
                    <span key={k} className="badge-blue">{k}</span>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {result.tips?.length > 0 && (
                <div className="card">
                  <p className="section-label mb-3">💡 Tips</p>
                  <ul className="space-y-2">
                    {result.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-300">
                        <span className="text-acid mt-0.5">·</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Zap size={32} className="text-ink-700 mx-auto mb-4" />
                <p className="text-ink-400 text-sm">Enter your app details to get optimized ASO metadata</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
