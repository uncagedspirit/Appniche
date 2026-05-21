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

// GET /api/niches/categories
router.get('/categories', (req, res) => {
  res.json(CATEGORIES);
});

// GET /api/niches/analyze?category=HEALTH_AND_FITNESS&country=us
router.get('/analyze', async (req, res) => {
  const { category, country = 'us', lang = 'en' } = req.query;
  if (!category) return res.status(400).json({ error: 'category is required' });

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

    // Opportunity score: low avg rating + many low-rated apps = higher opportunity
    const opportunityScore = Math.round(
      ((5 - freeStats.avgRating) / 5) * 50 +
      (freeStats.lowRatedCount / 30) * 30 +
      20
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

// GET /api/niches/opportunities?country=us - scan multiple categories for best opportunities
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

export default router;
