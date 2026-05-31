const KEYS = {
  searches: 'appniche_searches',
  analyses: 'appniche_analyses',
  ideas: 'appniche_ideas',
  tracked: 'appniche_tracked',
  collections: 'appniche_collections',
  watchlist: 'appniche_watchlist',
  rankHistory: 'appniche_rank_history',
};

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
};
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const genId = () => Math.random().toString(36).slice(2, 10);

export const dbOps = {
  async saveSearch(_uid, data) {
    const items = read(KEYS.searches);
    const item = { id: genId(), ...data, createdAt: new Date().toISOString() };
    write(KEYS.searches, [item, ...items]);
    return item;
  },
  async getSearches(_uid) {
    return read(KEYS.searches);
  },
  async deleteSearch(_uid, searchId) {
    write(KEYS.searches, read(KEYS.searches).filter(x => x.id !== searchId));
  },

  async saveCollection(_uid, data) {
    const items = read(KEYS.collections);
    const item = { id: genId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    write(KEYS.collections, [item, ...items]);
    return item;
  },
  async getCollections(_uid) {
    return read(KEYS.collections);
  },
  async updateCollection(_uid, collectionId, data) {
    write(KEYS.collections, read(KEYS.collections).map(x =>
      x.id === collectionId ? { ...x, ...data, updatedAt: new Date().toISOString() } : x
    ));
  },
  async deleteCollection(_uid, collectionId) {
    write(KEYS.collections, read(KEYS.collections).filter(x => x.id !== collectionId));
  },

  async trackApp(_uid, appData) {
    const id = `${appData.platform}_${appData.appId}`;
    const items = read(KEYS.tracked).filter(x => x.id !== id);
    write(KEYS.tracked, [{ id, ...appData, trackedAt: new Date().toISOString() }, ...items]);
  },
  async getTrackedApps(_uid) {
    return read(KEYS.tracked);
  },
  async untrackApp(_uid, appId, platform) {
    write(KEYS.tracked, read(KEYS.tracked).filter(x => x.id !== `${platform}_${appId}`));
  },

  async saveAnalysis(_uid, data) {
    const items = read(KEYS.analyses);
    const item = { id: genId(), ...data, createdAt: new Date().toISOString() };
    write(KEYS.analyses, [item, ...items]);
    return item;
  },
  async getAnalyses(_uid) {
    return read(KEYS.analyses);
  },

  async saveIdea(_uid, data) {
    const items = read(KEYS.ideas);
    const item = { id: genId(), ...data, createdAt: new Date().toISOString() };
    write(KEYS.ideas, [item, ...items]);
    return item;
  },
  async getIdeas(_uid) {
    return read(KEYS.ideas);
  },
  async deleteIdea(_uid, ideaId) {
    write(KEYS.ideas, read(KEYS.ideas).filter(x => x.id !== ideaId));
  },

  async setUserProfile(_uid, _data) {},
  async getUserProfile(_uid) { return null; },

  // Keyword rank snapshots — stored per keyword+country combo
  saveRankSnapshot(keyword, country, apps) {
    const all = read(KEYS.rankHistory);
    const item = {
      id: genId(),
      keyword: keyword.toLowerCase().trim(),
      country,
      date: new Date().toISOString(),
      apps: apps.slice(0, 20).map((a, i) => ({
        rank: i + 1,
        appId: a.appId,
        title: a.title,
        icon: a.icon,
        score: a.score,
      })),
    };
    write(KEYS.rankHistory, [item, ...all].slice(0, 1000));
    return item;
  },
  getRankHistory(keyword) {
    const norm = keyword.toLowerCase().trim();
    return read(KEYS.rankHistory)
      .filter(x => x.keyword === norm)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getTrackedRankKeywords() {
    const all = read(KEYS.rankHistory);
    return [...new Set(all.map(x => x.keyword))];
  },
  deleteRankHistory(keyword) {
    const norm = keyword.toLowerCase().trim();
    write(KEYS.rankHistory, read(KEYS.rankHistory).filter(x => x.keyword !== norm));
  },

  async addToWatchlist(_uid, appData) {
    const id = `${appData.platform}_${appData.appId}`;
    const items = read(KEYS.watchlist).filter(x => x.id !== id);
    write(KEYS.watchlist, [{ id, ...appData, addedAt: new Date().toISOString(), snapshot: appData.snapshot || null }, ...items]);
  },
  async getWatchlist(_uid) {
    return read(KEYS.watchlist);
  },
  async removeFromWatchlist(_uid, appId, platform) {
    write(KEYS.watchlist, read(KEYS.watchlist).filter(x => x.id !== `${platform}_${appId}`));
  },
  async updateWatchlistSnapshot(_uid, appId, platform, snapshot) {
    write(KEYS.watchlist, read(KEYS.watchlist).map(x =>
      x.id === `${platform}_${appId}` ? { ...x, snapshot, lastChecked: new Date().toISOString() } : x
    ));
  },
};
