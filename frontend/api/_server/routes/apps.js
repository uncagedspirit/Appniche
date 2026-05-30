import express from 'express';
import gplay from 'google-play-scraper';
import store from 'app-store-scraper';
import { getCached, setCache } from '../services/cache.js';

const router = express.Router();

// GET /api/apps/search?q=habit+tracker&platform=android&country=us&num=20
router.get('/search', async (req, res) => {
  const { q, platform = 'android', country = 'us', lang = 'en', num = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });

  const cacheKey = `search:${q}:${platform}:${country}:${num}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    let apps = [];
    if (platform === 'android') {
      apps = await gplay.search({ term: q, num: Math.min(parseInt(num) || 20, 250), country, lang, fullDetail: false });
      apps = apps.map(a => ({
        appId: a.appId,
        title: a.title,
        developer: a.developer,
        developerId: a.developerId,
        icon: a.icon,
        score: a.score,
        scoreText: a.scoreText,
        reviews: a.reviews,
        installs: a.installs,
        free: a.free,
        price: a.price,
        currency: a.currency,
        genre: a.genre,
        genreId: a.genreId,
        summary: a.summary,
        url: a.url,
        platform: 'android'
      }));
    } else {
      apps = await store.search({ term: q, num: Math.min(parseInt(num) || 20, 250), country });
      apps = apps.map(a => ({
        appId: String(a.id),
        title: a.title,
        developer: a.developer,
        icon: a.icon,
        score: a.score,
        reviews: a.reviews,
        free: a.free,
        price: a.price,
        genre: a.primaryGenre,
        summary: a.description?.slice(0, 200),
        url: a.url,
        platform: 'ios'
      }));
    }
    setCache(cacheKey, apps, 1800);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/apps/detail?appId=com.example&platform=android&country=us
router.get('/detail', async (req, res) => {
  const { appId, platform = 'android', country = 'us', lang = 'en' } = req.query;
  if (!appId) return res.status(400).json({ error: 'appId is required' });

  const cacheKey = `detail:${appId}:${platform}:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    let app = {};
    if (platform === 'android') {
      const a = await gplay.app({ appId, country, lang });
      app = {
        appId: a.appId,
        title: a.title,
        developer: a.developer,
        developerId: a.developerId,
        icon: a.icon,
        headerImage: a.headerImage,
        screenshots: a.screenshots,
        score: a.score,
        scoreText: a.scoreText,
        ratings: a.ratings,
        reviews: a.reviews,
        histogram: a.histogram,
        installs: a.installs,
        minInstalls: a.minInstalls,
        maxInstalls: a.maxInstalls,
        free: a.free,
        price: a.price,
        currency: a.currency,
        description: a.description,
        summary: a.summary,
        genre: a.genre,
        genreId: a.genreId,
        contentRating: a.contentRating,
        released: a.released,
        updated: a.updated,
        version: a.version,
        size: a.size,
        androidVersion: a.androidVersion,
        url: a.url,
        recentChanges: a.recentChanges,
        platform: 'android'
      };
    } else {
      const a = await store.app({ id: appId, country });
      app = {
        appId: String(a.id),
        title: a.title,
        developer: a.developer,
        icon: a.icon,
        screenshots: a.screenshots,
        score: a.score,
        reviews: a.reviews,
        free: a.free,
        price: a.price,
        description: a.description,
        genre: a.primaryGenre,
        released: a.released,
        updated: a.updated,
        version: a.version,
        size: a.size,
        url: a.url,
        platform: 'ios'
      };
    }
    setCache(cacheKey, app, 3600);
    res.json(app);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/apps/reviews?appId=com.example&platform=android&num=100&sort=newest
router.get('/reviews', async (req, res) => {
  const { appId, platform = 'android', num = 100, sort = 'newest', country = 'us', lang = 'en' } = req.query;
  if (!appId) return res.status(400).json({ error: 'appId is required' });

  const cacheKey = `reviews:${appId}:${platform}:${num}:${sort}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    let reviews = [];
    if (platform === 'android') {
      const sortMap = { newest: gplay.sort.NEWEST, rating: gplay.sort.RATING, helpfulness: gplay.sort.HELPFULNESS };
      const result = await gplay.reviews({
        appId, sort: sortMap[sort] || gplay.sort.NEWEST, num: Math.min(parseInt(num) || 100, 500), lang, country
      });
      reviews = (result.data || []).map(r => ({
        id: r.id,
        userName: r.userName,
        userImage: r.userImage,
        date: r.date,
        score: r.score,
        scoreText: r.scoreText,
        title: r.title,
        text: r.text,
        thumbsUp: r.thumbsUp,
        replyDate: r.replyDate,
        replyText: r.replyText,
        version: r.version
      }));
    } else {
      const sortMap = { newest: store.sort.RECENT, rating: store.sort.HELPFUL };
      const result = await store.reviews({ id: appId, sort: sortMap[sort] || store.sort.RECENT, page: 1, country });
      reviews = (result || []).map(r => ({
        id: r.id,
        userName: r.userName,
        date: r.date,
        score: r.score,
        title: r.title,
        text: r.text,
        version: r.version
      }));
    }
    setCache(cacheKey, reviews, 1800);
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/apps/similar?appId=com.example&platform=android
router.get('/similar', async (req, res) => {
  const { appId, platform = 'android', country = 'us', lang = 'en' } = req.query;
  if (!appId) return res.status(400).json({ error: 'appId is required' });

  const cacheKey = `similar:${appId}:${platform}:${country}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    let apps = [];
    if (platform === 'android') {
      apps = await gplay.similar({ appId, country, lang });
    } else {
      apps = await store.similar({ id: appId, country });
    }
    const result = apps.slice(0, 20).map(a => ({
      appId: a.appId || String(a.id),
      title: a.title,
      developer: a.developer,
      icon: a.icon,
      score: a.score,
      reviews: a.reviews,
      free: a.free,
      platform
    }));
    setCache(cacheKey, result, 3600);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
