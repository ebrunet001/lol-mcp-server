import { LRUCache } from 'lru-cache';
import { log } from 'apify';
import { CACHE_TTL } from '../constants/index.js';

// Cache configuration
interface CacheConfig {
    enabled: boolean;
}

// Different cache stores with different TTLs
const caches = {
    dataDragon: new LRUCache<string, any>({
        max: 50,
        ttl: CACHE_TTL.DATA_DRAGON,
    }),
    playerProfile: new LRUCache<string, any>({
        max: 50,
        ttl: CACHE_TTL.PLAYER_PROFILE,
    }),
    rankedInfo: new LRUCache<string, any>({
        max: 50,
        ttl: CACHE_TTL.RANKED_INFO,
    }),
    matchDetails: new LRUCache<string, any>({
        max: 100,
        ttl: CACHE_TTL.MATCH_DETAILS,
    }),
    matchIds: new LRUCache<string, any>({
        max: 50,
        ttl: CACHE_TTL.MATCH_IDS,
    }),
    liveGame: new LRUCache<string, any>({
        max: 20,
        ttl: CACHE_TTL.LIVE_GAME,
    }),
    championMastery: new LRUCache<string, any>({
        max: 50,
        ttl: CACHE_TTL.CHAMPION_MASTERY,
    }),
};

type CacheStore = keyof typeof caches;

let config: CacheConfig = { enabled: true };

/**
 * Initialize cache configuration
 */
export function initCache(enabled: boolean = true): void {
    config.enabled = enabled;
    log.info(`Cache ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if cache is enabled
 */
export function isCacheEnabled(): boolean {
    return config.enabled;
}

/**
 * Get value from cache
 */
export function cacheGet<T>(store: CacheStore, key: string): T | undefined {
    if (!config.enabled) return undefined;

    const cache = caches[store];
    const value = cache.get(key) as T | undefined;

    if (value !== undefined) {
        log.debug(`Cache hit: ${store}:${key}`);
    }

    return value;
}

/**
 * Set value in cache
 */
export function cacheSet<T>(store: CacheStore, key: string, value: T): void {
    if (!config.enabled) return;

    const cache = caches[store];
    cache.set(key, value);
    log.debug(`Cache set: ${store}:${key}`);
}

/**
 * Delete value from cache
 */
export function cacheDelete(store: CacheStore, key: string): void {
    const cache = caches[store];
    cache.delete(key);
}

/**
 * Clear entire cache store
 */
export function cacheClear(store?: CacheStore): void {
    if (store) {
        caches[store].clear();
        log.info(`Cache cleared: ${store}`);
    } else {
        Object.values(caches).forEach(cache => cache.clear());
        log.info('All caches cleared');
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): Record<string, { size: number; maxSize: number }> {
    const stats: Record<string, { size: number; maxSize: number }> = {};

    for (const [name, cache] of Object.entries(caches)) {
        stats[name] = {
            size: cache.size,
            maxSize: cache.max,
        };
    }

    return stats;
}

/**
 * Decorator for caching function results
 */
export function withCache<T>(
    store: CacheStore,
    keyFn: (...args: any[]) => string,
    fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
    return async (...args: any[]): Promise<T> => {
        const key = keyFn(...args);

        // Check cache first
        const cached = cacheGet<T>(store, key);
        if (cached !== undefined) {
            return cached;
        }

        // Execute function and cache result
        const result = await fn(...args);
        cacheSet(store, key, result);

        return result;
    };
}
