import express from 'express';
import gplay from 'google-play-scraper';
import axios from 'axios';
import { getCached, setCache } from '../services/cache.js';

const router = express.Router();

function alphabetExpand(seed) {
  return 'abcdefghijklmnopqrstuvwxyz'.split('').map(l => `${seed} ${l}`);
}

// Play Store suggestions
async function getPlaySuggestions(term, lang = 'en', country = 'us') {
  try {
    const suggestions = await gplay.suggest({ term, lang, country });
    return suggestions || [];
  } catch (e) {
    return [];
  }
}

// Apple App Store suggestions via iTunes API
async function getAppleSuggestions(term, country = 'us') {
  try {
    const url = `https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=${encodeURIComponent(term)}&country=${country}`;
    const res = await axios.get(url, { timeout: 5000 });
    return (res.data?.hints || []).map(h => h.term || h);
  } catch (e) {
    return [];
  }
}

// GET /api/keywords/suggest?q=habit+tracker&country=us&lang=en
router.get('/suggest', async (req, res) => {
  const { q, country = 'us', lang = 'en' } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });

  const cacheKey = `suggest:${q}:${country}:${lang}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const [playSuggestions, appleSuggestions] = await Promise.all([
    getPlaySuggestions(q, lang, country),
    getAppleSuggestions(q, country)
  ]);

  const combined = [...new Set([...playSuggestions, ...appleSuggestions])];
  const result = { play: playSuggestions, apple: appleSuggestions, combined };
  setCache(cacheKey, result, 1800);
  res.json(result);
});

// GET /api/keywords/expand?q=fitness&country=us - full alphabet expansion
router.get('/expand', async (req, res) => {
  const { q, country = 'us', lang = 'en' } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });

  const cacheKey = `expand:${q}:${country}:${lang}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const expansions = alphabetExpand(q);
  const batchSize = 5;
  const allKeywords = new Set();

  // Also get direct suggestions for base term
  const base = await getPlaySuggestions(q, lang, country);
  base.forEach(k => allKeywords.add(k));

  // Process expansions in batches
  for (let i = 0; i < expansions.length; i += batchSize) {
    const batch = expansions.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(e => getPlaySuggestions(e, lang, country)));
    results.forEach(arr => arr.forEach(k => allKeywords.add(k)));
    await new Promise(r => setTimeout(r, 300));
  }

  // Also run apple
  const appleBase = await getAppleSuggestions(q, country);
  appleBase.forEach(k => allKeywords.add(k));

  const keywords = [...allKeywords].filter(k => k && k.length > 0);
  const result = { seed: q, total: keywords.length, keywords };
  setCache(cacheKey, result, 3600);
  res.json(result);
});

// GET /api/keywords/difficulty?keywords=fitness,workout&country=us
// Estimates difficulty by looking at competition (# of results, avg rating of top apps)
router.get('/difficulty', async (req, res) => {
  const { keywords, country = 'us', lang = 'en' } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords is required' });

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 20);
  const cacheKey = `difficulty:${kwList.join(',')}:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const results = await Promise.all(kwList.map(async (kw) => {
    try {
      const apps = await gplay.search({ term: kw, num: 10, country, lang, fullDetail: false });
      if (!apps || apps.length === 0) return { keyword: kw, difficulty: 0, competition: 0, avgRating: 0, topApps: 0 };

      const avgRating = apps.reduce((s, a) => s + (a.score || 0), 0) / apps.length;
      const avgReviews = apps.reduce((s, a) => s + (a.reviews || 0), 0) / apps.length;

      // Score 0-100: high ratings + high reviews = harder to compete
      const ratingFactor = (avgRating / 5) * 40;
      const reviewFactor = Math.min(avgReviews / 100000, 1) * 40;
      const countFactor = (apps.length / 10) * 20;
      const difficulty = Math.round(ratingFactor + reviewFactor + countFactor);

      return {
        keyword: kw,
        difficulty,
        competition: apps.length,
        avgRating: parseFloat(avgRating.toFixed(2)),
        avgReviews: Math.round(avgReviews),
        topApps: apps.slice(0, 3).map(a => ({ title: a.title, score: a.score, appId: a.appId }))
      };
    } catch (e) {
      return { keyword: kw, difficulty: 50, error: e.message };
    }
  }));

  setCache(cacheKey, results, 3600);
  res.json(results);
});

export default router;
