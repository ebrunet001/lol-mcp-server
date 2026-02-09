import { z } from 'zod';
import { log } from 'apify';
import {
    GetAccountSchema,
    GetSummonerSchema,
    GetRankedSchema,
    GetPlayerProfileSchema,
} from '../schemas/index.js';
import {
    getAccountByRiotId,
    getSummonerByPuuid,
    getRankedEntries,
    getPlayerProfile,
} from '../services/riot-client.js';
import { getProfileIconUrl } from '../services/data-dragon.js';
import { chargeForTool } from '../services/billing.js';
import type { Region, ToolResponse } from '../types/index.js';

/**
 * Format ranked info for display
 */
function formatRankedInfo(entries: any[]): string {
    if (!entries || entries.length === 0) {
        return 'Unranked';
    }

    return entries.map(entry => {
        const queueName = entry.queueType === 'RANKED_SOLO_5x5' ? 'Solo/Duo' : 'Flex';
        const winRate = ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(1);
        return `${queueName}: ${entry.tier} ${entry.rank} (${entry.leaguePoints} LP) - ${entry.wins}W/${entry.losses}L (${winRate}%)`;
    }).join('\n');
}

/**
 * Get account by Riot ID tool
 */
export const lol_get_account = {
    name: 'lol_get_account',
    description: 'Get a League of Legends account by Riot ID (gameName#tagLine). Returns the PUUID needed for other API calls.',
    schema: GetAccountSchema,
    handler: async (args: z.infer<typeof GetAccountSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_account');
        const { gameName, tagLine, region } = args;

        log.info(`Getting account for ${gameName}#${tagLine} in ${region}`);
        const account = await getAccountByRiotId(gameName, tagLine, region as Region);

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    gameName: account.gameName,
                    tagLine: account.tagLine,
                    puuid: account.puuid,
                    riotId: `${account.gameName}#${account.tagLine}`,
                    message: `Account found. Use the PUUID "${account.puuid.substring(0, 20)}..." for other API calls.`,
                }, null, 2),
            }],
        };
    },
};

/**
 * Get summoner info tool
 */
export const lol_get_summoner = {
    name: 'lol_get_summoner',
    description: 'Get summoner information (level, profile icon) by PUUID.',
    schema: GetSummonerSchema,
    handler: async (args: z.infer<typeof GetSummonerSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_summoner');
        const { puuid, region } = args;

        log.info(`Getting summoner for PUUID ${puuid.substring(0, 8)}... in ${region}`);
        const summoner = await getSummonerByPuuid(puuid, region as Region);

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    summonerId: summoner.id,
                    puuid: summoner.puuid,
                    summonerLevel: summoner.summonerLevel,
                    profileIconId: summoner.profileIconId,
                    profileIconUrl: getProfileIconUrl(summoner.profileIconId),
                }, null, 2),
            }],
        };
    },
};

/**
 * Get ranked info tool
 */
export const lol_get_ranked = {
    name: 'lol_get_ranked',
    description: 'Get ranked information (tier, rank, LP, win/loss) for a player by PUUID.',
    schema: GetRankedSchema,
    handler: async (args: z.infer<typeof GetRankedSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_ranked');
        const { puuid, region } = args;

        log.info(`Getting ranked info for PUUID ${puuid.substring(0, 8)}... in ${region}`);
        const rankedEntries = await getRankedEntries(puuid, region as Region);

        const formattedRanked = rankedEntries.map(entry => ({
            queueType: entry.queueType === 'RANKED_SOLO_5x5' ? 'Ranked Solo/Duo' : 'Ranked Flex',
            tier: entry.tier,
            rank: entry.rank,
            leaguePoints: entry.leaguePoints,
            wins: entry.wins,
            losses: entry.losses,
            winRate: ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(1) + '%',
            totalGames: entry.wins + entry.losses,
            hotStreak: entry.hotStreak,
            veteran: entry.veteran,
            freshBlood: entry.freshBlood,
            inactive: entry.inactive,
        }));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    rankedInfo: formattedRanked,
                    summary: formatRankedInfo(rankedEntries),
                    isUnranked: rankedEntries.length === 0,
                }, null, 2),
            }],
        };
    },
};

/**
 * Get complete player profile tool
 */
export const lol_get_player_profile = {
    name: 'lol_get_player_profile',
    description: 'Get a complete player profile including account, summoner info, and ranked stats by Riot ID. This is the recommended starting point for player analysis.',
    schema: GetPlayerProfileSchema,
    handler: async (args: z.infer<typeof GetPlayerProfileSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_player_profile');
        const { gameName, tagLine, region } = args;

        log.info(`Getting complete profile for ${gameName}#${tagLine} in ${region}`);
        const profile = await getPlayerProfile(gameName, tagLine, region as Region);

        // Get solo/duo ranked entry
        const soloQueue = profile.ranked.find(e => e.queueType === 'RANKED_SOLO_5x5');
        const flexQueue = profile.ranked.find(e => e.queueType === 'RANKED_FLEX_SR');

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    account: {
                        gameName: profile.account.gameName,
                        tagLine: profile.account.tagLine,
                        puuid: profile.account.puuid,
                        riotId: `${profile.account.gameName}#${profile.account.tagLine}`,
                    },
                    summoner: {
                        summonerLevel: profile.summoner.summonerLevel,
                        profileIconId: profile.summoner.profileIconId,
                        profileIconUrl: getProfileIconUrl(profile.summoner.profileIconId),
                    },
                    ranked: {
                        soloQueue: soloQueue ? {
                            tier: soloQueue.tier,
                            rank: soloQueue.rank,
                            lp: soloQueue.leaguePoints,
                            wins: soloQueue.wins,
                            losses: soloQueue.losses,
                            winRate: ((soloQueue.wins / (soloQueue.wins + soloQueue.losses)) * 100).toFixed(1) + '%',
                            hotStreak: soloQueue.hotStreak,
                        } : null,
                        flexQueue: flexQueue ? {
                            tier: flexQueue.tier,
                            rank: flexQueue.rank,
                            lp: flexQueue.leaguePoints,
                            wins: flexQueue.wins,
                            losses: flexQueue.losses,
                            winRate: ((flexQueue.wins / (flexQueue.wins + flexQueue.losses)) * 100).toFixed(1) + '%',
                        } : null,
                    },
                    summary: formatRankedInfo(profile.ranked),
                }, null, 2),
            }],
        };
    },
};

// Export all account tools
export const accountTools = [
    lol_get_account,
    lol_get_summoner,
    lol_get_ranked,
    lol_get_player_profile,
];
