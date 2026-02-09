// Re-export all types
export * from './riot-api.js';
export * from './data-dragon.js';

// Actor Input
export interface ActorInput {
    riotApiKey: string;
    defaultRegion?: import('./riot-api.js').Region;
    defaultLanguage?: 'en' | 'fr';
    cacheEnabled?: boolean;
}

// Billing Events
export type BillingEvent =
    | 'tool-read'
    | 'tool-match'
    | 'tool-analysis'
    | 'tool-live'
    | 'tool-compare';

// Analysis Types
export interface PlayerStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    totalCS: number;
    totalVisionScore: number;
    totalDamage: number;
    totalGold: number;
    totalGameTime: number;
    positionStats: Record<string, { games: number; wins: number }>;
    championStats: Record<string, ChampionGameStats>;
}

export interface ChampionGameStats {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    damage: number;
}

export interface PerformanceMetrics {
    winRate: string;
    avgKDA: string;
    avgCSPerMin: string;
    avgVisionPerMin: string;
    avgDeathsPerGame: string;
    avgDamagePerMin: string;
    avgGoldPerMin: string;
}

export interface AnalysisResult {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    metrics: PerformanceMetrics;
}

// Tier-based benchmarks
export type RankTier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';

export interface TierBenchmarks {
    csPerMin: { poor: number; average: number; good: number; excellent: number };
    visionPerMin: { poor: number; average: number; good: number; excellent: number };
    kda: { poor: number; average: number; good: number; excellent: number };
    deathsPerGame: { acceptable: number; high: number };
}

// Tool Response - compatible with MCP SDK
export interface ToolResponse {
    [key: string]: unknown;
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}

// Language type
export type Language = 'en' | 'fr';
