const cache = new Map<string, { data: unknown; expiry: number }>();

export const cacheService = {
  get: <T>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    return entry.data as T;
  },
  set: <T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
  },
  delete: (key: string): void => {
    cache.delete(key);
  },
  clear: (): void => {
    cache.clear();
  },
};