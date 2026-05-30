import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000,
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    throw new Error(msg);
  }
);

// Keywords
export const keywordsAPI = {
  suggest: (q, country = 'us', lang = 'en') =>
    api.get('/keywords/suggest', { params: { q, country, lang } }),

  expand: (q, country = 'us', lang = 'en') =>
    api.get('/keywords/expand', { params: { q, country, lang } }),

  difficulty: (keywords, country = 'us') =>
    api.get('/keywords/difficulty', { params: { keywords: keywords.join(','), country } }),
};

// Apps
export const appsAPI = {
  search: (q, platform = 'android', country = 'us', num = 20) =>
    api.get('/apps/search', { params: { q, platform, country, num } }),

  detail: (appId, platform = 'android', country = 'us') =>
    api.get('/apps/detail', { params: { appId, platform, country } }),

  reviews: (appId, platform = 'android', num = 100, sort = 'newest') =>
    api.get('/apps/reviews', { params: { appId, platform, num, sort } }),

  similar: (appId, platform = 'android', country = 'us') =>
    api.get('/apps/similar', { params: { appId, platform, country } }),
};

// Niches
export const nichesAPI = {
  categories: () => api.get('/niches/categories'),
  analyze: (category, country = 'us') =>
    api.get('/niches/analyze', { params: { category, country } }),
  opportunities: (country = 'us') =>
    api.get('/niches/opportunities', { params: { country } }),
  search: (q, country = 'us', page = 0) =>
    api.get('/niches/search', { params: { q, country, page } }),
  checkApps: (ids, country = 'us') =>
    api.get('/niches/check-apps', { params: { ids: ids.join(','), country } }),
};

// Analysis
export const analysisAPI = {
  gaps: (appId, platform = 'android', niche = '', country = 'us') =>
    api.post('/analysis/gaps', { appId, platform, niche, country }),

  idea: (niche, gaps = [], keywords = [], competitorApps = [], targetCountry = 'Global') =>
    api.post('/analysis/idea', { niche, gaps, keywords, competitorApps, targetCountry }),

  competitorMatrix: (appIds, platform = 'android', country = 'us') =>
    api.post('/analysis/competitor-matrix', { appIds, platform, country }),

  asoOptimize: (appName, description, targetKeywords, category, platform = 'android') =>
    api.post('/analysis/aso-optimize', { appName, description, targetKeywords, category, platform }),

  marketReport: (niche, country = 'us') =>
    api.post('/analysis/market-report', { niche, country }),
};

export default api;
