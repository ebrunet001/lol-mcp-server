import type { RankTier, TierBenchmarks } from '../types/index.js';

// Ranked Tiers (ordered)
export const RANKED_TIERS: RankTier[] = [
    'IRON',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'EMERALD',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'CHALLENGER',
];

// Tier icons for display
export const TIER_ICONS: Record<RankTier, string> = {
    IRON: 'I',
    BRONZE: 'B',
    SILVER: 'S',
    GOLD: 'G',
    PLATINUM: 'P',
    EMERALD: 'E',
    DIAMOND: 'D',
    MASTER: 'M',
    GRANDMASTER: 'GM',
    CHALLENGER: 'C',
};

// Tier colors (for display)
export const TIER_COLORS: Record<RankTier, string> = {
    IRON: '#6B5B5B',
    BRONZE: '#8B4513',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: '#B9F2FF',
    MASTER: '#9370DB',
    GRANDMASTER: '#DC143C',
    CHALLENGER: '#00BFFF',
};

// Benchmarks by rank tier (expectations increase with rank)
export const TIER_BENCHMARKS: Record<RankTier, TierBenchmarks> = {
    IRON: {
        csPerMin: { poor: 3, average: 4, good: 5, excellent: 6 },
        visionPerMin: { poor: 0.2, average: 0.3, good: 0.4, excellent: 0.5 },
        kda: { poor: 1, average: 1.5, good: 2, excellent: 2.5 },
        deathsPerGame: { acceptable: 8, high: 10 },
    },
    BRONZE: {
        csPerMin: { poor: 3.5, average: 4.5, good: 5.5, excellent: 6.5 },
        visionPerMin: { poor: 0.25, average: 0.35, good: 0.45, excellent: 0.55 },
        kda: { poor: 1.2, average: 1.8, good: 2.3, excellent: 2.8 },
        deathsPerGame: { acceptable: 7, high: 9 },
    },
    SILVER: {
        csPerMin: { poor: 4, average: 5, good: 6, excellent: 7 },
        visionPerMin: { poor: 0.3, average: 0.4, good: 0.5, excellent: 0.6 },
        kda: { poor: 1.5, average: 2, good: 2.5, excellent: 3 },
        deathsPerGame: { acceptable: 6.5, high: 8 },
    },
    GOLD: {
        csPerMin: { poor: 4.5, average: 5.5, good: 6.5, excellent: 7.5 },
        visionPerMin: { poor: 0.35, average: 0.5, good: 0.6, excellent: 0.75 },
        kda: { poor: 1.8, average: 2.3, good: 3, excellent: 3.5 },
        deathsPerGame: { acceptable: 6, high: 7.5 },
    },
    PLATINUM: {
        csPerMin: { poor: 5, average: 6, good: 7, excellent: 8 },
        visionPerMin: { poor: 0.4, average: 0.55, good: 0.7, excellent: 0.85 },
        kda: { poor: 2, average: 2.5, good: 3.2, excellent: 4 },
        deathsPerGame: { acceptable: 5.5, high: 7 },
    },
    EMERALD: {
        csPerMin: { poor: 5.5, average: 6.5, good: 7.5, excellent: 8.5 },
        visionPerMin: { poor: 0.45, average: 0.6, good: 0.8, excellent: 1 },
        kda: { poor: 2.2, average: 2.8, good: 3.5, excellent: 4.5 },
        deathsPerGame: { acceptable: 5, high: 6.5 },
    },
    DIAMOND: {
        csPerMin: { poor: 6, average: 7, good: 8, excellent: 9 },
        visionPerMin: { poor: 0.5, average: 0.7, good: 0.9, excellent: 1.1 },
        kda: { poor: 2.5, average: 3, good: 4, excellent: 5 },
        deathsPerGame: { acceptable: 4.5, high: 6 },
    },
    MASTER: {
        csPerMin: { poor: 6.5, average: 7.5, good: 8.5, excellent: 9.5 },
        visionPerMin: { poor: 0.55, average: 0.75, good: 1, excellent: 1.2 },
        kda: { poor: 2.8, average: 3.5, good: 4.5, excellent: 5.5 },
        deathsPerGame: { acceptable: 4, high: 5.5 },
    },
    GRANDMASTER: {
        csPerMin: { poor: 7, average: 8, good: 9, excellent: 10 },
        visionPerMin: { poor: 0.6, average: 0.8, good: 1.1, excellent: 1.3 },
        kda: { poor: 3, average: 3.8, good: 5, excellent: 6 },
        deathsPerGame: { acceptable: 3.5, high: 5 },
    },
    CHALLENGER: {
        csPerMin: { poor: 7.5, average: 8.5, good: 9.5, excellent: 10.5 },
        visionPerMin: { poor: 0.65, average: 0.85, good: 1.2, excellent: 1.4 },
        kda: { poor: 3.2, average: 4, good: 5.5, excellent: 7 },
        deathsPerGame: { acceptable: 3, high: 4.5 },
    },
};

// Default benchmarks (for unranked players - use Gold as baseline)
export const DEFAULT_BENCHMARKS = TIER_BENCHMARKS.GOLD;

// Position-specific CS benchmarks (multipliers)
export const POSITION_CS_MULTIPLIERS: Record<string, number> = {
    TOP: 1.0,
    JUNGLE: 0.75, // Jungle CS counts differently
    MIDDLE: 1.05,
    BOTTOM: 1.1, // ADCs should have highest CS
    UTILITY: 0.2, // Supports have very low CS
};

// Position-specific vision benchmarks (multipliers)
export const POSITION_VISION_MULTIPLIERS: Record<string, number> = {
    TOP: 0.8,
    JUNGLE: 1.2,
    MIDDLE: 0.9,
    BOTTOM: 0.8,
    UTILITY: 2.5, // Supports should have highest vision
};

/**
 * Get benchmarks for a specific tier
 */
export function getBenchmarksForTier(tier: string | undefined): TierBenchmarks {
    if (!tier || !TIER_BENCHMARKS[tier as RankTier]) {
        return DEFAULT_BENCHMARKS;
    }
    return TIER_BENCHMARKS[tier as RankTier];
}

/**
 * Get tier index (0-9, higher = better)
 */
export function getTierIndex(tier: string): number {
    const index = RANKED_TIERS.indexOf(tier as RankTier);
    return index >= 0 ? index : 3; // Default to GOLD level
}
