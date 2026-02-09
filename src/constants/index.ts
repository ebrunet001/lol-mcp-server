// Re-export all constants
export * from './regions.js';
export * from './queues.js';
export * from './benchmarks.js';
export * from './messages/index.js';

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
    DATA_DRAGON: 24 * 60 * 60 * 1000,     // 24 hours (static data)
    PLAYER_PROFILE: 5 * 60 * 1000,         // 5 minutes
    RANKED_INFO: 5 * 60 * 1000,            // 5 minutes
    MATCH_DETAILS: 7 * 24 * 60 * 60 * 1000, // 7 days (matches don't change)
    MATCH_IDS: 2 * 60 * 1000,              // 2 minutes (new matches can appear)
    LIVE_GAME: 30 * 1000,                  // 30 seconds
    CHAMPION_MASTERY: 10 * 60 * 1000,      // 10 minutes
};

// API Base URLs
export const API_URLS = {
    DATA_DRAGON: 'https://ddragon.leagueoflegends.com',
    DATA_DRAGON_CDN: 'https://ddragon.leagueoflegends.com/cdn',
};

// Rate limiting
export const RATE_LIMITS = {
    REQUESTS_PER_SECOND: 20,
    REQUESTS_PER_2_MINUTES: 100,
    RETRY_DELAY_MS: 1000,
    MAX_RETRIES: 3,
};
