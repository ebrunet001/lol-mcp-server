import { z } from 'zod';

// Region schema
export const RegionSchema = z.enum([
    'euw1', 'eun1', 'na1', 'kr', 'br1', 'la1', 'la2',
    'oc1', 'tr1', 'ru', 'jp1', 'ph2', 'sg2', 'th2', 'tw2', 'vn2'
]).describe('Server region');

// Language schema
export const LanguageSchema = z.enum(['en', 'fr']).describe('Language for messages');

// PUUID schema (78 character hex string)
export const PuuidSchema = z.string()
    .min(1)
    .describe('Player PUUID (78-character unique identifier)');

// Riot ID components
export const GameNameSchema = z.string()
    .min(1)
    .max(16)
    .describe('Riot ID game name (before the #)');

export const TagLineSchema = z.string()
    .min(1)
    .max(5)
    .describe('Riot ID tag line (after the #)');

// Match ID (format: REGION_NUMBER)
export const MatchIdSchema = z.string()
    .min(1)
    .describe('Match ID (e.g., EUW1_1234567890)');

// Champion name
export const ChampionNameSchema = z.string()
    .min(1)
    .describe('Champion name (e.g., "Thresh", "Lee Sin")');

// Queue type filter
export const QueueTypeSchema = z.enum(['ranked', 'normal', 'all'])
    .describe('Queue type filter');

// Count schema (with min/max)
export const CountSchema = (min: number, max: number, defaultVal: number) =>
    z.number()
        .min(min)
        .max(max)
        .optional()
        .default(defaultVal)
        .describe(`Number of items (${min}-${max}, default: ${defaultVal})`);
