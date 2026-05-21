import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export const getCached = (key) => cache.get(key);
export const setCache = (key, value, ttl = 3600) => cache.set(key, value, ttl);
export const delCache = (key) => cache.del(key);
