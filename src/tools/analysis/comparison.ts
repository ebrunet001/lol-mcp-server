import { z } from 'zod';
import { log } from 'apify';
import { ComparePlayersSchema } from '../../schemas/index.js';
import {
    getAccountByRiotId,
    getRecentMatchesWithDetails,
    getRankedEntries,
} from '../../services/riot-client.js';
import { chargeForTool } from '../../services/billing.js';
import { POSITIONS } from '../../constants/index.js';
import type { Region, Match, ToolResponse } from '../../types/index.js';

/**
 * Calculate stats for comparison
 */
function calculateComparisonStats(matches: Match[], puuid: string) {
    let gamesPlayed = 0, wins = 0;
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalCS = 0, totalVision = 0, totalDamage = 0, totalGold = 0;
    let totalGameTime = 0;
    const champions: Record<string, number> = {};
    const positions: Record<string, number> = {};

    for (const match of matches) {
        const participant = match.info.participants.find(p => p.puuid === puuid);
        if (!participant) continue;

        gamesPlayed++;
        if (participant.win) wins++;

        totalKills += participant.kills;
        totalDeaths += participant.deaths;
        totalAssists += participant.assists;
        totalCS += participant.totalMinionsKilled + participant.neutralMinionsKilled;
        totalVision += participant.visionScore;
        totalDamage += participant.totalDamageDealtToChampions;
        totalGold += participant.goldEarned;
        totalGameTime += match.info.gameDuration;

        // Track champions and positions
        champions[participant.championName] = (champions[participant.championName] || 0) + 1;
        const pos = participant.teamPosition || 'UNKNOWN';
        positions[pos] = (positions[pos] || 0) + 1;
    }

    return {
        gamesPlayed,
        wins,
        losses: gamesPlayed - wins,
        winRate: gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) + '%' : '0%',
        avgKDA: gamesPlayed > 0 && totalDeaths > 0
            ? ((totalKills + totalAssists) / totalDeaths).toFixed(2)
            : 'Perfect',
        avgKills: gamesPlayed > 0 ? (totalKills / gamesPlayed).toFixed(1) : '0',
        avgDeaths: gamesPlayed > 0 ? (totalDeaths / gamesPlayed).toFixed(1) : '0',
        avgAssists: gamesPlayed > 0 ? (totalAssists / gamesPlayed).toFixed(1) : '0',
        avgCSPerMin: totalGameTime > 0 ? (totalCS / (totalGameTime / 60)).toFixed(1) : '0',
        avgVisionPerMin: totalGameTime > 0 ? (totalVision / (totalGameTime / 60)).toFixed(2) : '0',
        avgDamagePerMin: totalGameTime > 0 ? Math.round(totalDamage / (totalGameTime / 60)) : 0,
        avgGoldPerMin: totalGameTime > 0 ? Math.round(totalGold / (totalGameTime / 60)) : 0,
        topChampions: Object.entries(champions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, games: count })),
        mainPosition: Object.entries(positions)
            .sort((a, b) => b[1] - a[1])[0]?.[0],
    };
}

/**
 * Compare two players tool
 */
export const lol_compare_players = {
    name: 'lol_compare_players',
    description: 'Compare two players\' statistics side by side. Shows differences in KDA, CS, vision, damage, and identifies who excels in what areas.',
    schema: ComparePlayersSchema,
    handler: async (args: z.infer<typeof ComparePlayersSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_compare_players');
        const { player1, player2, matchCount, queueType, region } = args;

        log.info(`Comparing ${player1.gameName}#${player1.tagLine} vs ${player2.gameName}#${player2.tagLine} in ${region}`);

        // Get account info for both players
        const [account1, account2] = await Promise.all([
            getAccountByRiotId(player1.gameName, player1.tagLine, region as Region),
            getAccountByRiotId(player2.gameName, player2.tagLine, region as Region),
        ]);

        // Get ranked info for both players
        const [ranked1, ranked2] = await Promise.all([
            getRankedEntries(account1.puuid, region as Region),
            getRankedEntries(account2.puuid, region as Region),
        ]);

        // Get matches for both players
        const queueFilter = queueType === 'ranked' ? 'ranked' : queueType === 'normal' ? 'normal' : undefined;
        const [matches1, matches2] = await Promise.all([
            getRecentMatchesWithDetails(account1.puuid, matchCount, queueFilter, region as Region),
            getRecentMatchesWithDetails(account2.puuid, matchCount, queueFilter, region as Region),
        ]);

        // Calculate stats
        const stats1 = calculateComparisonStats(matches1, account1.puuid);
        const stats2 = calculateComparisonStats(matches2, account2.puuid);

        // Get solo queue ranks
        const soloQueue1 = ranked1.find(e => e.queueType === 'RANKED_SOLO_5x5');
        const soloQueue2 = ranked2.find(e => e.queueType === 'RANKED_SOLO_5x5');

        // Determine advantages
        const advantages: { category: string; winner: string; margin: string }[] = [];

        // Win rate comparison
        const wr1 = parseFloat(stats1.winRate);
        const wr2 = parseFloat(stats2.winRate);
        if (Math.abs(wr1 - wr2) >= 3) {
            advantages.push({
                category: 'Win Rate',
                winner: wr1 > wr2 ? `${account1.gameName}` : `${account2.gameName}`,
                margin: `+${Math.abs(wr1 - wr2).toFixed(1)}%`,
            });
        }

        // KDA comparison
        const kda1 = parseFloat(stats1.avgKDA) || 0;
        const kda2 = parseFloat(stats2.avgKDA) || 0;
        if (Math.abs(kda1 - kda2) >= 0.3) {
            advantages.push({
                category: 'KDA',
                winner: kda1 > kda2 ? `${account1.gameName}` : `${account2.gameName}`,
                margin: `+${Math.abs(kda1 - kda2).toFixed(2)}`,
            });
        }

        // CS comparison
        const cs1 = parseFloat(stats1.avgCSPerMin);
        const cs2 = parseFloat(stats2.avgCSPerMin);
        if (Math.abs(cs1 - cs2) >= 0.5) {
            advantages.push({
                category: 'CS/min',
                winner: cs1 > cs2 ? `${account1.gameName}` : `${account2.gameName}`,
                margin: `+${Math.abs(cs1 - cs2).toFixed(1)}`,
            });
        }

        // Vision comparison
        const vision1 = parseFloat(stats1.avgVisionPerMin);
        const vision2 = parseFloat(stats2.avgVisionPerMin);
        if (Math.abs(vision1 - vision2) >= 0.1) {
            advantages.push({
                category: 'Vision/min',
                winner: vision1 > vision2 ? `${account1.gameName}` : `${account2.gameName}`,
                margin: `+${Math.abs(vision1 - vision2).toFixed(2)}`,
            });
        }

        // Damage comparison
        const dmg1 = stats1.avgDamagePerMin;
        const dmg2 = stats2.avgDamagePerMin;
        if (Math.abs(dmg1 - dmg2) >= 50) {
            advantages.push({
                category: 'Damage/min',
                winner: dmg1 > dmg2 ? `${account1.gameName}` : `${account2.gameName}`,
                margin: `+${Math.abs(dmg1 - dmg2)}`,
            });
        }

        // Generate summary
        const p1Advantages = advantages.filter(a => a.winner === account1.gameName).length;
        const p2Advantages = advantages.filter(a => a.winner === account2.gameName).length;

        let summary: string;
        if (p1Advantages > p2Advantages) {
            summary = `${account1.gameName} has an edge in ${p1Advantages} categories`;
        } else if (p2Advantages > p1Advantages) {
            summary = `${account2.gameName} has an edge in ${p2Advantages} categories`;
        } else {
            summary = 'Both players are evenly matched based on recent performance';
        }

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    comparison: {
                        gamesAnalyzed: {
                            [account1.gameName]: stats1.gamesPlayed,
                            [account2.gameName]: stats2.gamesPlayed,
                        },
                    },
                    players: {
                        [account1.gameName]: {
                            riotId: `${account1.gameName}#${account1.tagLine}`,
                            rank: soloQueue1 ? `${soloQueue1.tier} ${soloQueue1.rank}` : 'Unranked',
                            rankLP: soloQueue1?.leaguePoints,
                            mainPosition: POSITIONS[stats1.mainPosition] || stats1.mainPosition,
                            stats: stats1,
                        },
                        [account2.gameName]: {
                            riotId: `${account2.gameName}#${account2.tagLine}`,
                            rank: soloQueue2 ? `${soloQueue2.tier} ${soloQueue2.rank}` : 'Unranked',
                            rankLP: soloQueue2?.leaguePoints,
                            mainPosition: POSITIONS[stats2.mainPosition] || stats2.mainPosition,
                            stats: stats2,
                        },
                    },
                    advantages,
                    summary,
                    commonChampions: findCommonChampions(stats1.topChampions, stats2.topChampions),
                }, null, 2),
            }],
        };
    },
};

/**
 * Find common champions between two players
 */
function findCommonChampions(
    champs1: { name: string; games: number }[],
    champs2: { name: string; games: number }[]
): string[] {
    const names1 = new Set(champs1.map(c => c.name));
    return champs2.filter(c => names1.has(c.name)).map(c => c.name);
}

// Export comparison tools
export const comparisonTools = [
    lol_compare_players,
];
