import { z } from 'zod';
import {
    RegionSchema,
    PuuidSchema,
    GameNameSchema,
    TagLineSchema,
    MatchIdSchema,
    QueueTypeSchema,
} from './common.js';

// Get account by Riot ID
export const GetAccountSchema = z.object({
    gameName: GameNameSchema,
    tagLine: TagLineSchema,
    region: RegionSchema.optional().default('euw1'),
});

// Get summoner by PUUID
export const GetSummonerSchema = z.object({
    puuid: PuuidSchema,
    region: RegionSchema.optional().default('euw1'),
});

// Get ranked info by PUUID
export const GetRankedSchema = z.object({
    puuid: PuuidSchema,
    region: RegionSchema.optional().default('euw1'),
});

// Get match history
export const GetMatchHistorySchema = z.object({
    puuid: PuuidSchema,
    count: z.number().min(1).max(100).optional().default(20)
        .describe('Number of matches to retrieve (1-100, default: 20)'),
    queueType: QueueTypeSchema.optional(),
    region: RegionSchema.optional().default('euw1'),
});

// Get match details
export const GetMatchDetailsSchema = z.object({
    matchId: MatchIdSchema,
    region: RegionSchema.optional().default('euw1'),
});

// Get match timeline
export const GetMatchTimelineSchema = z.object({
    matchId: MatchIdSchema,
    region: RegionSchema.optional().default('euw1'),
});

// Get champion mastery
export const GetChampionMasterySchema = z.object({
    puuid: PuuidSchema,
    top: z.number().min(1).max(50).optional().default(10)
        .describe('Number of top champions to retrieve (1-50, default: 10)'),
    region: RegionSchema.optional().default('euw1'),
});

// Get player profile (combined)
export const GetPlayerProfileSchema = z.object({
    gameName: GameNameSchema,
    tagLine: TagLineSchema,
    region: RegionSchema.optional().default('euw1'),
});

// Get live game
export const GetLiveGameSchema = z.object({
    puuid: PuuidSchema,
    region: RegionSchema.optional().default('euw1'),
});
