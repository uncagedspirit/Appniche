import express from 'express';
import gplay from 'google-play-scraper';
import axios from 'axios';
import { getCached, setCache } from '../services/cache.js';

const router = express.Router();

async function callClaude(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    timeout: 30000
  });

  return res.data.content[0].text;
}

// POST /api/analysis/gaps
// Body: { appId, platform, niche, reviewTexts (optional) }
router.post('/gaps', async (req, res) => {
  const { appId, platform = 'android', niche, country = 'us', lang = 'en' } = req.body;
  if (!appId) return res.status(400).json({ error: 'appId is required' });

  const cacheKey = `gaps:${appId}:${platform}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Fetch app detail
    let appDetail, reviews;
    if (platform === 'android') {
      [appDetail, { data: reviews }] = await Promise.all([
        gplay.app({ appId, country, lang }),
        gplay.reviews({ appId, sort: gplay.sort.NEWEST, num: 150, lang, country })
      ]);
    } else {
      const store = (await import('app-store-scraper')).default;
      [appDetail, reviews] = await Promise.all([
        store.app({ id: appId, country }),
        store.reviews({ id: appId, sort: store.sort.RECENT, page: 1, country })
      ]);
    }

    const reviewTexts = (reviews || [])
      .filter(r => r.text && r.text.length > 20)
      .slice(0, 100)
      .map(r => `[${r.score}★] ${r.text}`)
      .join('\n');

    const systemPrompt = `You are an expert app market analyst. Analyze user reviews and identify product gaps, unmet needs, and opportunities. Be specific and actionable. Respond ONLY with valid JSON.`;

    const userPrompt = `App: "${appDetail.title}" (${niche || appDetail.genre})
Rating: ${appDetail.score}/5 (${appDetail.reviews} reviews)
Description: ${appDetail.description?.slice(0, 500)}

User Reviews (${reviews?.length || 0} recent):
${reviewTexts.slice(0, 3000)}

Analyze these reviews and return JSON with this exact structure:
{
  "appName": "string",
  "overallSentiment": "positive|mixed|negative",
  "sentimentScore": 0-100,
  "topComplaints": [
    { "issue": "string", "frequency": "high|medium|low", "quotes": ["quote1", "quote2"], "opportunity": "string" }
  ],
  "missingFeatures": [
    { "feature": "string", "requestCount": "many|some|few", "description": "string" }
  ],
  "strengthsToCopy": [
    { "strength": "string", "description": "string" }
  ],
  "gapScore": 0-100,
  "summary": "2-3 sentence summary of the biggest opportunity"
}`;

    const raw = await callClaude(systemPrompt, userPrompt);
    const clean = raw.replace(/```json|```/gi, '').trim();
    const analysis = JSON.parse(clean);
    analysis.appId = appId;
    analysis.platform = platform;

    setCache(cacheKey, analysis, 7200);
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/analysis/idea
// Body: { niche, gaps (array), keywords (array), targetCountry }
router.post('/idea', async (req, res) => {
  const { niche, gaps = [], keywords = [], targetCountry = 'Global', competitorApps = [] } = req.body;
  if (!niche) return res.status(400).json({ error: 'niche is required' });

  const cacheKey = `idea:${niche}:${gaps.slice(0,3).join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const systemPrompt = `You are a senior product strategist and app entrepreneur. Generate highly specific, actionable app ideas based on real market gaps. Avoid generic ideas. Be ultra-specific. Respond ONLY with valid JSON.`;

  const userPrompt = `Niche: ${niche}
Target Market: ${targetCountry}
Keywords people are searching: ${keywords.slice(0, 20).join(', ')}
Gaps found in existing apps: ${gaps.map(g => g.issue || g).slice(0, 10).join('; ')}
Existing competitors: ${competitorApps.slice(0, 5).map(a => a.title || a).join(', ')}

Generate 3 distinct app ideas that fill these gaps. Return JSON:
{
  "ideas": [
    {
      "name": "App Name",
      "tagline": "One-line pitch",
      "concept": "2-3 sentence description",
      "targetAudience": "Specific user persona",
      "coreFeatures": ["feature1", "feature2", "feature3", "feature4", "feature5"],
      "uniqueAngle": "What makes this different from competitors",
      "monetization": "Specific monetization strategy with price points",
      "asoKeywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8"],
      "buildComplexity": "low|medium|high",
      "revenueEstimate": "e.g. $2k-10k/mo at 1000 users",
      "mvpFeatures": ["feature1", "feature2", "feature3"],
      "timeToMVP": "e.g. 4-6 weeks"
    }
  ]
}`;

  try {
    const raw = await callClaude(systemPrompt, userPrompt);
    const clean = raw.replace(/```json|```/gi, '').trim();
    const result = JSON.parse(clean);
    setCache(cacheKey, result, 7200);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/analysis/competitor-matrix
// Body: { appIds, platform, country }
router.post('/competitor-matrix', async (req, res) => {
  const { appIds = [], platform = 'android', country = 'us', lang = 'en' } = req.body;
  if (!appIds.length) return res.status(400).json({ error: 'appIds required' });

  const cacheKey = `matrix:${appIds.join(',')}:${platform}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const iosStore = platform === 'ios' ? (await import('app-store-scraper')).default : null;
    const apps = await Promise.all(appIds.slice(0, 8).map(async (appId) => {
      try {
        if (platform === 'android') {
          const a = await gplay.app({ appId, country, lang });
          return {
            appId: a.appId, title: a.title, developer: a.developer, icon: a.icon,
            score: a.score, reviews: a.reviews, installs: a.installs,
            minInstalls: a.minInstalls, free: a.free, price: a.price,
            updated: a.updated, version: a.version, genre: a.genre,
            description: a.description?.slice(0, 300)
          };
        }
        const a = await iosStore.app({ id: appId, country });
        return {
          appId: String(a.id), title: a.title, developer: a.developer, icon: a.icon,
          score: a.score, reviews: a.reviews, installs: null,
          minInstalls: null, free: a.free, price: a.price,
          updated: a.updated, version: a.version, genre: a.primaryGenre,
          description: a.description?.slice(0, 300)
        };
      } catch { return null; }
    }));

    const valid = apps.filter(Boolean);

    const systemPrompt = `You are an app market analyst. Compare these apps and provide a competitive analysis matrix. Respond ONLY with valid JSON.`;
    const userPrompt = `Compare these ${valid.length} apps in the same niche:
${valid.map(a => `- ${a.title}: ${a.score}★, ${a.reviews} reviews, ${a.installs} installs, updated ${a.updated}. ${a.description}`).join('\n')}

Return JSON:
{
  "summary": "Overall competitive landscape summary",
  "leader": "app title of the clear leader",
  "mostVulnerable": "app title most open to competition",
  "marketGap": "The main gap in this competitive set",
  "comparison": [
    {
      "appId": "string",
      "strengths": ["s1","s2"],
      "weaknesses": ["w1","w2"],
      "opportunity": "string"
    }
  ]
}`;

    const raw = await callClaude(systemPrompt, userPrompt);
    const clean = raw.replace(/```json|```/gi, '').trim();
    const matrix = JSON.parse(clean);
    matrix.apps = valid;

    setCache(cacheKey, matrix, 7200);
    res.json(matrix);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/analysis/aso-optimize
// Body: { title, description, keywords, platform }
router.post('/aso-optimize', async (req, res) => {
  const { appName, description, targetKeywords = [], category, platform = 'android' } = req.body;
  if (!appName) return res.status(400).json({ error: 'appName is required' });

  const systemPrompt = `You are an ASO (App Store Optimization) expert. Optimize app metadata for maximum discoverability. Respond ONLY with valid JSON.`;

  const userPrompt = `App Name: ${appName}
Platform: ${platform}
Category: ${category || 'unknown'}
Target Keywords: ${targetKeywords.join(', ')}
Current Description: ${description?.slice(0, 500) || 'none'}

Generate optimized ASO metadata. Return JSON:
{
  "optimizedTitle": "Title (max 30 chars for Android, 30 for iOS)",
  "optimizedSubtitle": "Subtitle (max 80 chars)",
  "shortDescription": "80-char Play Store short description",
  "optimizedDescription": "Full optimized description (2000 chars)",
  "primaryKeywords": ["kw1","kw2","kw3","kw4","kw5"],
  "longTailKeywords": ["phrase1","phrase2","phrase3","phrase4","phrase5"],
  "iosKeywordField": "Comma-separated keywords for iOS keyword field (100 chars max)",
  "tips": ["tip1", "tip2", "tip3"]
}`;

  try {
    const raw = await callClaude(systemPrompt, userPrompt);
    const clean = raw.replace(/```json|```/gi, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/analysis/market-report
// Body: { niche, country, lang }
router.post('/market-report', async (req, res) => {
  const { niche, country = 'us', lang = 'en' } = req.body;
  if (!niche?.trim()) return res.status(400).json({ error: 'niche is required' });

  const cacheKey = `market-report:${niche.trim().toLowerCase()}:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [searchResults, suggestions] = await Promise.all([
      gplay.search({ term: niche, num: 50, country, lang, fullDetail: false }).catch(() => []),
      gplay.suggest({ term: niche, country, lang }).catch(() => []),
    ]);

    const top5 = searchResults.slice(0, 5);
    const detailResults = await Promise.allSettled(
      top5.map(app => Promise.race([
        gplay.app({ appId: app.appId, country, lang }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]))
    );
    const competitors = detailResults.map((r, i) => r.status === 'fulfilled' ? r.value : top5[i]);

    const topKeywords = (suggestions || []).slice(0, 6);
    const kwDifficulties = await Promise.all(topKeywords.map(async (kw) => {
      try {
        const apps = await gplay.search({ term: kw, num: 10, country, lang, fullDetail: false });
        const avgRating = apps.reduce((s, a) => s + (a.score || 0), 0) / (apps.length || 1);
        const avgReviews = apps.reduce((s, a) => s + (a.reviews || 0), 0) / (apps.length || 1);
        const difficulty = Math.round((avgRating / 5) * 40 + Math.min(avgReviews / 100000, 1) * 40 + (apps.length / 10) * 20);
        return { keyword: kw, difficulty, competition: apps.length, avgRating: parseFloat(avgRating.toFixed(2)) };
      } catch { return { keyword: kw, difficulty: 50 }; }
    }));

    const scored = searchResults.filter(a => a.score > 0);
    const avgRating = scored.length ? scored.reduce((s, a) => s + a.score, 0) / scored.length : 0;
    const avgReviews = searchResults.reduce((s, a) => s + (a.reviews || 0), 0) / (searchResults.length || 1);
    const totalInstalls = searchResults.reduce((s, a) => s + (a.minInstalls || 0), 0);
    const weakApps = searchResults.filter(a => a.score > 0 && a.score < 4.0).length;

    const opportunityScore = Math.min(100, Math.max(0, Math.round(
      ((5 - avgRating) / 5) * 40 +
      (weakApps / Math.max(searchResults.length, 1)) * 30 +
      Math.min(Math.log10(Math.max(totalInstalls, 10)) / Math.log10(10_000_000) * 30, 30)
    )));

    const competitorSummary = competitors.slice(0, 5).map(a =>
      `- ${a.title}: ${a.score}★, ${a.reviews} reviews, ${a.installs || 'unknown'} installs. ${(a.description || '').slice(0, 100)}`
    ).join('\n');

    const systemPrompt = `You are a senior app market strategist. Analyze real market data and give a precise, actionable market entry report. Be honest about saturation. Respond ONLY with valid JSON.`;

    const userPrompt = `Niche: "${niche}"
Market data:
- Apps found: ${searchResults.length}
- Avg rating: ${avgRating.toFixed(2)}/5
- Avg reviews per app: ${Math.round(avgReviews)}
- Total installs (top 50): ${totalInstalls.toLocaleString()}
- Apps rated below 4.0: ${weakApps} of ${searchResults.length}
- Opportunity score: ${opportunityScore}/100

Top competitors:
${competitorSummary}

Top keywords: ${topKeywords.join(', ')}

Return JSON:
{
  "verdict": "Go" | "Caution" | "Avoid",
  "verdictReason": "2-sentence explanation of the verdict",
  "marketSummary": "3-sentence overview of the market landscape",
  "whitespace": "The specific gap no current app fills well (1-2 sentences)",
  "differentiationAngles": ["angle1", "angle2", "angle3"],
  "revenueEstimate": {
    "conservative": "$X-Yk/mo at 1000 DAU",
    "optimistic": "$X-Yk/mo at 5000 DAU"
  },
  "topKeywordsInsight": "1-2 sentences on keyword opportunity in this niche",
  "risks": ["risk1", "risk2", "risk3"],
  "goToMarketTip": "The single most important first move to enter this market"
}`;

    const raw = await callClaude(systemPrompt, userPrompt);
    const aiInsights = JSON.parse(raw.replace(/```json|```/gi, '').trim());

    const report = {
      niche,
      country,
      generatedAt: new Date().toISOString(),
      opportunityScore,
      marketData: {
        totalApps: searchResults.length,
        avgRating: parseFloat(avgRating.toFixed(2)),
        avgReviews: Math.round(avgReviews),
        totalInstalls,
        weakAppsCount: weakApps,
      },
      topCompetitors: competitors.slice(0, 5).map(a => ({
        appId: a.appId, title: a.title, developer: a.developer,
        icon: a.icon, score: a.score, reviews: a.reviews,
        installs: a.installs, description: (a.description || '').slice(0, 150),
      })),
      topKeywords: kwDifficulties,
      ...aiInsights,
    };

    setCache(cacheKey, report, 7200);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
