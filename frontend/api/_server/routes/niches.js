import express from 'express';
import gplay from 'google-play-scraper';
import { getCached, setCache } from '../services/cache.js';

const router = express.Router();

const CATEGORIES = [
  { id: 'ART_AND_DESIGN', name: 'Art & Design' },
  { id: 'AUTO_AND_VEHICLES', name: 'Auto & Vehicles' },
  { id: 'BEAUTY', name: 'Beauty' },
  { id: 'BOOKS_AND_REFERENCE', name: 'Books & Reference' },
  { id: 'BUSINESS', name: 'Business' },
  { id: 'COMICS', name: 'Comics' },
  { id: 'COMMUNICATION', name: 'Communication' },
  { id: 'DATING', name: 'Dating' },
  { id: 'EDUCATION', name: 'Education' },
  { id: 'ENTERTAINMENT', name: 'Entertainment' },
  { id: 'EVENTS', name: 'Events' },
  { id: 'FINANCE', name: 'Finance' },
  { id: 'FOOD_AND_DRINK', name: 'Food & Drink' },
  { id: 'HEALTH_AND_FITNESS', name: 'Health & Fitness' },
  { id: 'HOUSE_AND_HOME', name: 'House & Home' },
  { id: 'LIFESTYLE', name: 'Lifestyle' },
  { id: 'MAPS_AND_NAVIGATION', name: 'Maps & Navigation' },
  { id: 'MEDICAL', name: 'Medical' },
  { id: 'MUSIC_AND_AUDIO', name: 'Music & Audio' },
  { id: 'NEWS_AND_MAGAZINES', name: 'News & Magazines' },
  { id: 'PARENTING', name: 'Parenting' },
  { id: 'PERSONALIZATION', name: 'Personalization' },
  { id: 'PHOTOGRAPHY', name: 'Photography' },
  { id: 'PRODUCTIVITY', name: 'Productivity' },
  { id: 'SHOPPING', name: 'Shopping' },
  { id: 'SOCIAL', name: 'Social' },
  { id: 'SPORTS', name: 'Sports' },
  { id: 'TOOLS', name: 'Tools' },
  { id: 'TRAVEL_AND_LOCAL', name: 'Travel & Local' },
  { id: 'VIDEO_PLAYERS', name: 'Video Players' },
  { id: 'WEATHER', name: 'Weather' },
  { id: 'GAME_ACTION', name: 'Games: Action' },
  { id: 'GAME_ARCADE', name: 'Games: Arcade' },
  { id: 'GAME_CASUAL', name: 'Games: Casual' },
  { id: 'GAME_PUZZLE', name: 'Games: Puzzle' },
  { id: 'GAME_RACING', name: 'Games: Racing' },
  { id: 'GAME_RPG', name: 'Games: RPG' },
  { id: 'GAME_SIMULATION', name: 'Games: Simulation' },
  { id: 'GAME_SPORTS', name: 'Games: Sports' },
  { id: 'GAME_STRATEGY', name: 'Games: Strategy' },
  { id: 'GAME_WORD', name: 'Games: Word' }
];

// ── ASO quality score (0–100) ─────────────────────────────────────────────────
function computeASOScore(app) {
  let score = 0;
  const tl = (app.title || '').length;
  score += tl >= 20 && tl <= 50 ? 15 : tl >= 10 ? 8 : 3;
  const sl = (app.summary || '').length;
  score += sl >= 60 ? 10 : sl >= 30 ? 6 : sl > 0 ? 3 : 0;
  const dl = (app.description || '').length;
  score += dl >= 3000 ? 15 : dl >= 2000 ? 12 : dl >= 1000 ? 8 : dl >= 500 ? 4 : 0;
  const sc = (app.screenshots || []).length;
  score += sc >= 8 ? 15 : sc >= 5 ? 12 : sc >= 3 ? 7 : sc >= 1 ? 3 : 0;
  score += app.video ? 10 : 0;
  const r = app.score || 0;
  score += r >= 4.5 ? 20 : r >= 4.0 ? 15 : r >= 3.5 ? 8 : r >= 3.0 ? 3 : 0;
  const updated = app.updated ? new Date(app.updated) : null;
  const dsu = updated ? Math.floor((Date.now() - updated.getTime()) / 86400000) : 9999;
  score += dsu <= 30 ? 15 : dsu <= 90 ? 12 : dsu <= 180 ? 8 : dsu <= 365 ? 4 : 0;
  return Math.min(100, score);
}

// ── rough monthly revenue estimate (USD) ─────────────────────────────────────
function estimateRevenue(app) {
  const installs = app.minInstalls || 0;
  if (installs < 1000) return null;
  const dau = installs * 0.008;
  let monthly = 0;
  if (app.free === false && (app.price || 0) > 0) {
    monthly += (installs * 0.00008) * (app.price || 1) * 30;
  }
  if (app.offersIAP) monthly += dau * 0.03 * 3.5;
  if (app.adSupported) monthly += dau * 5 * 2 / 1000;
  const mult = (app.score || 3) >= 4.5 ? 1.5 : (app.score || 3) >= 4.0 ? 1.0 : 0.6;
  return Math.round(monthly * mult);
}

function parseInstalls(str) {
  return parseInt((str || '0').replace(/[^0-9]/g, '')) || 0;
}

function enrichApp(app, now) {
  const updatedDate  = app.updated  ? new Date(app.updated)  : null;
  const releasedDate = app.released ? new Date(app.released) : null;
  const daysSinceUpdate  = updatedDate  ? Math.floor((now - updatedDate.getTime())  / 86400000) : null;
  const daysSinceRelease = releasedDate ? Math.floor((now - releasedDate.getTime()) / 86400000) : null;
  const minInst = app.minInstalls || parseInstalls(app.installs);
  const dailyInstalls   = (daysSinceRelease && daysSinceRelease > 0) ? Math.round(minInst / daysSinceRelease) : null;
  const monthlyInstalls = dailyInstalls ? dailyInstalls * 30 : null;

  return {
    appId:           app.appId,
    title:           app.title,
    developer:       app.developer,
    developerId:     app.developerId || null,
    icon:            app.icon,
    score:           app.score || 0,
    reviews:         app.reviews || 0,
    ratings:         app.ratings || 0,
    installs:        app.installs || '—',
    minInstalls:     minInst,
    free:            app.free !== false,
    price:           app.price || 0,
    currency:        app.currency || 'USD',
    offersIAP:       app.offersIAP    || false,
    adSupported:     app.adSupported  || false,
    editorsChoice:   app.editorsChoice || false,
    contentRating:   app.contentRating || null,
    genre:           app.genre || null,
    version:         app.version || null,
    androidVersion:  app.androidVersion || null,
    size:            app.size || null,
    released:        app.released || null,
    updated:         app.updated  || null,
    daysSinceUpdate,
    daysSinceRelease,
    dailyInstalls,
    monthlyInstalls,
    screenshotCount: (app.screenshots || []).length,
    screenshotUrls:  (app.screenshots || []).slice(0, 10),
    hasVideo:        !!(app.video),
    titleLength:       (app.title       || '').length,
    descriptionLength: (app.description || '').length,
    descriptionSnippet: app.description
      ? app.description.substring(0, 200) + (app.description.length > 200 ? '…' : '')
      : null,
    summaryLength:   (app.summary || '').length,
    summaryText:     app.summary || null,
    histogram:       app.histogram || null,
    asoScore:        computeASOScore(app),
    revenueEstimate: estimateRevenue(app),
  };
}

function computeMetrics(enriched) {
  const scored    = enriched.filter(a => a.score > 0);
  const avgRating = scored.length ? scored.reduce((s, a) => s + a.score, 0) / scored.length : 0;
  const instNums  = enriched.map(a => a.minInstalls);
  const avgInstalls = instNums.reduce((s, i) => s + i, 0) / (instNums.length || 1);

  const weakApps        = enriched.filter(a => a.score > 0 && a.score < 4.0);
  const strongApps      = enriched.filter(a => a.score >= 4.3 && a.minInstalls >= 50000);
  const abandonedApps   = enriched.filter(a => a.daysSinceUpdate !== null && a.daysSinceUpdate > 365);
  const recentlyUpdated = enriched.filter(a => a.daysSinceUpdate !== null && a.daysSinceUpdate <= 90);
  const avgASOScore = Math.round(enriched.reduce((s, a) => s + a.asoScore, 0) / (enriched.length || 1));

  const demandScore = Math.min(100, Math.max(5,
    Math.round(Math.log10(Math.max(avgInstalls, 10)) / Math.log10(5_000_000) * 100)
  ));
  const competitionScore = Math.min(100, Math.max(0, Math.round(
    (avgRating / 5) * 50 + (strongApps.length / Math.max(enriched.length, 1)) * 50
  )));
  const opportunityScore = Math.min(100, Math.max(0, Math.round(
    demandScore * 0.5 + (100 - competitionScore) * 0.5
  )));

  return {
    opportunityScore,
    demandScore,
    competitionScore,
    avgRating:            parseFloat(avgRating.toFixed(2)),
    avgInstalls:          Math.round(avgInstalls),
    avgASOScore,
    weakAppsCount:        weakApps.length,
    strongAppsCount:      strongApps.length,
    abandonedCount:       abandonedApps.length,
    recentlyUpdatedCount: recentlyUpdated.length,
    verdict: opportunityScore >= 65 ? 'High Opportunity'
           : opportunityScore >= 45 ? 'Moderate Opportunity'
           : 'Saturated',
  };
}

// Two types of expansion pages:
// Static expansion groups — pages 1-20
const SEARCH_GROUPS = [
  ['a','b','c','d','e'],
  ['f','g','h','i','j'],
  ['k','l','m','n','o'],
  ['p','q','r','s','t'],
  ['u','v','w','x','y','z'],
  ['0','1','2','3','4','5','6','7','8','9'],
  ['app','free','pro','best','top'],
  ['daily','timer','music','sleep','calm'],
  ['relax','focus','stress','anxiety','mindful'],
  ['breathing','yoga','sounds','morning','guided'],
];

const CATEGORY_SWEEPS = [
  { category: 'HEALTH_AND_FITNESS', collection: 'TOP_FREE' },
  { category: 'HEALTH_AND_FITNESS', collection: 'TOP_GROSSING' },
  { category: 'HEALTH_AND_FITNESS', collection: 'NEW_FREE' },
  { category: 'LIFESTYLE',          collection: 'TOP_FREE' },
  { category: 'LIFESTYLE',          collection: 'TOP_GROSSING' },
  { category: 'MEDICAL',            collection: 'TOP_FREE' },
  { category: 'MUSIC_AND_AUDIO',    collection: 'TOP_FREE' },
  { category: 'EDUCATION',          collection: 'TOP_FREE' },
  { category: 'PRODUCTIVITY',       collection: 'TOP_FREE' },
  { category: 'SPORTS',             collection: 'TOP_FREE' },
];

const ALPHA       = 'abcdefghijklmnopqrstuvwxyz';
const COMBO_BATCH = 5;

// Two-letter combos aa-zz: 676 combos / 5 per page = 136 pages  (pages 21-156)
// Three-letter combos aaa-zzz: 17576 combos / 5 per page = 3516 pages (pages 157-3672)
// Practically inexhaustible — frontend will stop when it gets empty batches.
const TWO_LETTER_PAGES   = Math.ceil(676  / COMBO_BATCH); // 136
const THREE_LETTER_PAGES = Math.ceil(17576 / COMBO_BATCH); // 3516
const STATIC_EXPANSION   = SEARCH_GROUPS.length + CATEGORY_SWEEPS.length; // 20
const TOTAL_PAGES        = 1 + STATIC_EXPANSION + TWO_LETTER_PAGES + THREE_LETTER_PAGES; // 3673

function nthTwoLetter(n) {
  return ALPHA[Math.floor(n / 26)] + ALPHA[n % 26];
}
function nthThreeLetter(n) {
  return ALPHA[Math.floor(n / 676)] + ALPHA[Math.floor(n / 26) % 26] + ALPHA[n % 26];
}

// Resolve what a given expansion page (1-based) should fetch
function getPageDef(pageNum, baseQuery) {
  // Single-char / word groups (pages 1-10)
  if (pageNum <= SEARCH_GROUPS.length) {
    return { type: 'search', terms: SEARCH_GROUPS[pageNum - 1].map(t => `${baseQuery} ${t}`) };
  }
  // Category sweeps (pages 11-20)
  const catIdx = pageNum - SEARCH_GROUPS.length - 1;
  if (catIdx < CATEGORY_SWEEPS.length) {
    return { type: 'category', ...CATEGORY_SWEEPS[catIdx] };
  }
  // Two-letter combos aa-zz (pages 21-156)
  const twoIdx = pageNum - STATIC_EXPANSION - 1;
  if (twoIdx < TWO_LETTER_PAGES) {
    const start = twoIdx * COMBO_BATCH;
    const terms = Array.from({ length: COMBO_BATCH }, (_, i) => start + i)
      .filter(i => i < 676)
      .map(i => `${baseQuery} ${nthTwoLetter(i)}`);
    return terms.length ? { type: 'search', terms } : null;
  }
  // Three-letter combos aaa-zzz (pages 157-3672)
  const threeIdx = pageNum - STATIC_EXPANSION - TWO_LETTER_PAGES - 1;
  if (threeIdx < THREE_LETTER_PAGES) {
    const start = threeIdx * COMBO_BATCH;
    const terms = Array.from({ length: COMBO_BATCH }, (_, i) => start + i)
      .filter(i => i < 17576)
      .map(i => `${baseQuery} ${nthThreeLetter(i)}`);
    return terms.length ? { type: 'search', terms } : null;
  }
  return null;
}

// GET /api/niches/categories
router.get('/categories', (req, res) => {
  res.json(CATEGORIES);
});

// GET /api/niches/analyze?category=HEALTH_AND_FITNESS&country=us
router.get('/analyze', async (req, res) => {
  const { category, country = 'us', lang = 'en' } = req.query;
  if (!category) return res.status(400).json({ error: 'category is required' });
  if (!CATEGORIES.find(c => c.id === category)) return res.status(400).json({ error: 'unknown category' });

  const cacheKey = `niche:${category}:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [topFree, topPaid, topGrossing] = await Promise.all([
      gplay.list({ category: gplay.category[category], collection: gplay.collection.TOP_FREE, num: 30, country, lang }),
      gplay.list({ category: gplay.category[category], collection: gplay.collection.TOP_PAID, num: 30, country, lang }),
      gplay.list({ category: gplay.category[category], collection: gplay.collection.TOP_GROSSING, num: 30, country, lang })
    ]);

    const analyze = (apps) => {
      if (!apps.length) return { avgRating: 0, avgReviews: 0, lowRatedCount: 0 };
      const avgRating = apps.reduce((s, a) => s + (a.score || 0), 0) / apps.length;
      const avgReviews = apps.reduce((s, a) => s + (a.reviews || 0), 0) / apps.length;
      const lowRatedCount = apps.filter(a => (a.score || 0) < 4.0).length;
      return { avgRating: parseFloat(avgRating.toFixed(2)), avgReviews: Math.round(avgReviews), lowRatedCount };
    };

    const freeStats = analyze(topFree);
    const paidStats = analyze(topPaid);
    const opportunityScore = Math.round(
      ((5 - freeStats.avgRating) / 5) * 50 +
      (freeStats.lowRatedCount / 30) * 30 + 20
    );

    const result = {
      category,
      categoryName: CATEGORIES.find(c => c.id === category)?.name || category,
      opportunityScore: Math.min(opportunityScore, 100),
      topFree: topFree.slice(0, 20).map(a => ({
        appId: a.appId, title: a.title, developer: a.developer,
        icon: a.icon, score: a.score, reviews: a.reviews, installs: a.installs, free: true
      })),
      topPaid: topPaid.slice(0, 10).map(a => ({
        appId: a.appId, title: a.title, developer: a.developer,
        icon: a.icon, score: a.score, reviews: a.reviews, price: a.price, free: false
      })),
      topGrossing: topGrossing.slice(0, 10).map(a => ({
        appId: a.appId, title: a.title, developer: a.developer,
        icon: a.icon, score: a.score, reviews: a.reviews, installs: a.installs
      })),
      stats: { free: freeStats, paid: paidStats },
    };

    setCache(cacheKey, result, 3600);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/niches/opportunities?country=us
router.get('/opportunities', async (req, res) => {
  const { country = 'us', lang = 'en' } = req.query;
  const cacheKey = `opportunities:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const sampleCategories = [
    'HEALTH_AND_FITNESS', 'PRODUCTIVITY', 'EDUCATION', 'FINANCE',
    'LIFESTYLE', 'BUSINESS', 'TOOLS', 'FOOD_AND_DRINK',
    'BEAUTY', 'PARENTING', 'SPORTS', 'TRAVEL_AND_LOCAL'
  ];

  try {
    const results = await Promise.all(
      sampleCategories.map(async (category) => {
        try {
          const apps = await gplay.list({
            category: gplay.category[category],
            collection: gplay.collection.TOP_FREE,
            num: 20, country, lang
          });
          const avgRating = apps.reduce((s, a) => s + (a.score || 0), 0) / apps.length;
          const lowRatedCount = apps.filter(a => (a.score || 0) < 4.0).length;
          const opportunityScore = Math.round(((5 - avgRating) / 5) * 50 + (lowRatedCount / 20) * 30 + 20);
          return {
            category,
            name: CATEGORIES.find(c => c.id === category)?.name || category,
            avgRating: parseFloat(avgRating.toFixed(2)),
            lowRatedCount,
            opportunityScore: Math.min(opportunityScore, 100),
            topApp: apps[0] ? { title: apps[0].title, icon: apps[0].icon, score: apps[0].score } : null
          };
        } catch { return null; }
      })
    );
    const valid = results.filter(Boolean).sort((a, b) => b.opportunityScore - a.opportunityScore);
    setCache(cacheKey, valid, 3600);
    res.json(valid);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/niches/search?q=meditation&country=us&page=0
//
// page=0            : base query + autocomplete suggestions, enriched, returns metrics
// pages 1–10        : keyword variant search (num:30 each — one internal HTTP call,
//                     safely under Vercel's 10 s serverless timeout)
// pages 11–20       : category chart sweep via gplay.list() — surfaces apps that
//                     never appear in keyword search results
router.get('/search', async (req, res) => {
  const { q, country = 'us', lang = 'en', page = '0' } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const baseQuery = q.trim().toLowerCase();
  const pageNum   = Math.max(0, parseInt(page, 10) || 0);
  const cacheKey  = `niche-v10:${baseQuery}:${country}:p${pageNum}`;
  const cached    = getCached(cacheKey);
  if (cached) return res.json(cached);

  const now = Date.now();

  // num:30 = single internal HTTP call to Google Play (~1-2 s), no timeout risk
  const searchOne = (term) =>
    gplay.search({ term, country, lang, num: 30, fullDetail: false }).catch(() => []);

  try {
    if (pageNum === 0) {
      // ── Base page: use num:250 here only — this is the most important fetch ──
      const searchBase = (term) =>
        gplay.search({ term, country, lang, num: 250, fullDetail: false }).catch(() => []);

      const [baseApps, suggestions] = await Promise.all([
        searchBase(baseQuery),
        gplay.suggest({ term: baseQuery, country, lang }).catch(() => []),
      ]);

      const seed = baseQuery.split(/\s+/)[0];
      const suggestionTerms = (suggestions || [])
        .map(s => (s || '').toString().trim().toLowerCase())
        .filter(t => t && t !== baseQuery && t.includes(seed))
        .slice(0, 8);

      const suggestionResults = await Promise.all(suggestionTerms.map(searchBase));

      const seen = new Set();
      const allBasic = [];
      for (const app of [...baseApps, ...suggestionResults.flat()]) {
        if (!app?.appId || seen.has(app.appId)) continue;
        seen.add(app.appId);
        allBasic.push(app);
      }

      if (!allBasic.length) {
        return res.json({ query: q, apps: [], metrics: null, page: 0, totalPages: TOTAL_PAGES });
      }

      // Full detail for top 20 (8 s timeout per app)
      const detailResults = await Promise.allSettled(
        allBasic.slice(0, 20).map(app =>
          Promise.race([
            gplay.app({ appId: app.appId, country, lang }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ])
        )
      );

      const merged = [
        ...detailResults.map((r, i) => r.status === 'fulfilled' ? r.value : allBasic[i]),
        ...allBasic.slice(20),
      ];

      const enriched = merged.map(app => enrichApp(app, now));
      const metrics  = computeMetrics(enriched);

      const result = { query: q, apps: enriched, metrics, page: 0, totalPages: TOTAL_PAGES };
      setCache(cacheKey, result, 3600);
      return res.json(result);

    } else {
      const pageDef = getPageDef(pageNum, baseQuery);
      if (!pageDef) return res.json({ query: q, apps: [], page: pageNum, totalPages: TOTAL_PAGES });

      let allBasic = [];

      if (pageDef.type === 'search') {
        // ── Keyword variant search ───────────────────────────────────────────
        const results = await Promise.all(pageDef.terms.map(searchOne));
        const seen = new Set();
        for (const app of results.flat()) {
          if (!app?.appId || seen.has(app.appId)) continue;
          seen.add(app.appId);
          allBasic.push(app);
        }

      } else {
        // ── Category chart sweep ─────────────────────────────────────────────
        const col = gplay.collection[pageDef.collection] || gplay.collection.TOP_FREE;
        const cat = gplay.category[pageDef.category];
        if (!cat) return res.json({ query: q, apps: [], page: pageNum, totalPages: TOTAL_PAGES });

        const apps = await gplay.list({ category: cat, collection: col, num: 120, country, lang }).catch(() => []);
        const seen = new Set();
        for (const app of apps) {
          if (!app?.appId || seen.has(app.appId)) continue;
          seen.add(app.appId);
          allBasic.push(app);
        }
      }

      const enriched = allBasic.map(app => enrichApp(app, now));
      const result   = { query: q, apps: enriched, page: pageNum, totalPages: TOTAL_PAGES };
      setCache(cacheKey, result, 1800);
      return res.json(result);
    }

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/niches/check-apps?ids=com.app1,com.app2&country=us
router.get('/check-apps', async (req, res) => {
  const { ids, country = 'us', lang = 'en' } = req.query;
  if (!ids) return res.status(400).json({ error: 'ids is required' });

  const appIds = ids.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);

  const results = await Promise.all(appIds.map(async (appId) => {
    try {
      const app = await Promise.race([
        gplay.app({ appId, country, lang }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      return {
        appId,
        status: 'live',
        title:     app.title,
        developer: app.developer,
        icon:      app.icon,
        score:     app.score,
        installs:  app.installs,
        updated:   app.updated,
        daysSinceUpdate: app.updated
          ? Math.floor((Date.now() - new Date(app.updated).getTime()) / 86400000)
          : null,
      };
    } catch (e) {
      const msg = (e.message || '').toLowerCase();
      const removed = msg.includes('not found') || msg.includes('404') ||
                      msg.includes('app not found') || msg.includes('could not be found');
      return { appId, status: removed ? 'removed' : 'error', error: e.message };
    }
  }));

  res.json({ results });
});

export default router;
