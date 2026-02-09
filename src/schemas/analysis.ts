import { z } from 'zod';
import {
    RegionSchema,
    LanguageSchema,
    PuuidSchema,
    GameNameSchema,
    TagLineSchema,
    ChampionNameSchema,
    QueueTypeSchema,
} from './common.js';

// Performance analysis schema
export const AnalyzePerformanceSchema = z.object({
    puuid: PuuidSchema,
    matchCount: z.number().min(5).max(50).optional().default(20)
        .describe('Number of recent matches to analyze (5-50, default: 20)'),
    queueType: QueueTypeSchema.optional(),
    region: RegionSchema.optional().default('euw1'),
    language: LanguageSchema.optional().default('en'),
});

// Champion analysis schema
export const AnalyzeChampionSchema = z.object({
    puuid: PuuidSchema,
    championName: ChampionNameSchema,
    matchCount: z.number().min(3).max(50).optional().default(20)
        .describe('Number of matches to search for this champion (3-50, default: 20)'),
    region: RegionSchema.optional().default('euw1'),
    language: LanguageSchema.optional().default('en'),
});

// Improvement tips schema
export const GetImprovementTipsSchema = z.object({
    puuid: PuuidSchema,
    matchCount: z.number().min(5).max(50).optional().default(20)
        .describe('Number of recent matches to analyze (5-50, default: 20)'),
    queueType: QueueTypeSchema.optional(),
    region: RegionSchema.optional().default('euw1'),
    language: LanguageSchema.optional().default('en'),
});

// Player comparison schema
export const ComparePlayersSchema = z.object({
    player1: z.object({
        gameName: GameNameSchema,
        tagLine: TagLineSchema,
    }).describe('First player Riot ID'),
    player2: z.object({
        gameName: GameNameSchema,
        tagLine: TagLineSchema,
    }).describe('Second player Riot ID'),
    matchCount: z.number().min(5).max(30).optional().default(20)
        .describe('Number of matches to analyze per player (5-30, default: 20)'),
    queueType: QueueTypeSchema.optional(),
    region: RegionSchema.optional().default('euw1'),
    language: LanguageSchema.optional().default('en'),
});

// Laning analysis schema
export const AnalyzeLaningSchema = z.object({
    puuid: PuuidSchema,
    matchCount: z.number().min(3).max(20).optional().default(10)
        .describe('Number of matches to analyze (3-20, default: 10)'),
    position: z.enum(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']).optional()
        .describe('Filter by position'),
    region: RegionSchema.optional().default('euw1'),
    language: LanguageSchema.optional().default('en'),
});
