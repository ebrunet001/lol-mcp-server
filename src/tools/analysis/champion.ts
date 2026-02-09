import { z } from 'zod';
import { log } from 'apify';
import { AnalyzeChampionSchema } from '../../schemas/index.js';
import {
    getRecentMatchesWithDetails,
    getAccountByPuuid,
} from '../../services/riot-client.js';
import { getChampionByName } from '../../services/data-dragon.js';
import { chargeForTool } from '../../services/billing.js';
import { POSITIONS } from '../../constants/index.js';
import type { Region, ToolResponse } from '../../types/index.js';

/**
 * Champion-specific analysis tool
 */
export const lol_analyze_champion = {
    name: 'lol_analyze_champion',
    description: 'Analyze a player\'s performance on a specific champion with detailed statistics, recent matches, and improvement tips.',
    schema: AnalyzeChampionSchema,
    handler: async (args: z.infer<typeof AnalyzeChampionSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_analyze_champion');
        const { puuid, championName, matchCount, region } = args;

        log.info(`Analyzing ${championName} performance for PUUID ${puuid.substring(0, 8)}... in ${region}`);

        // Get account info
        const account = await getAccountByPuuid(puuid, region as Region);

        // Get champion data
        const championData = getChampionByName(championName);

        // Get recent matches
        const matches = await getRecentMatchesWithDetails(puuid, matchCount, undefined, region as Region);

        // Filter matches with the specific champion
        const championMatches = matches.filter(match => {
            const participant = match.info.participants.find(p => p.puuid === puuid);
            return participant && participant.championName.toLowerCase() === championName.toLowerCase();
        });

        if (championMatches.length === 0) {
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({
                        error: `No recent games found with ${championName}`,
                        player: `${account.gameName}#${account.tagLine}`,
                        message: `The player hasn't played ${championName} in the last ${matchCount} games.`,
                        suggestion: 'Try increasing the matchCount or check the champion name spelling.',
                        championInfo: championData ? {
                            name: championData.name,
                            title: championData.title,
                            roles: championData.roles,
                        } : null,
                    }, null, 2),
                }],
            };
        }

        // Calculate champion-specific stats
        let totalKills = 0, totalDeaths = 0, totalAssists = 0;
        let totalCS = 0, totalVision = 0, totalDamage = 0, totalGold = 0;
        let totalGameTime = 0, wins = 0;
        let firstBloods = 0, pentaKills = 0;
        const positionCounts: Record<string, number> = {};
        const matchDetails: any[] = [];

        for (const match of championMatches) {
            const participant = match.info.participants.find(p => p.puuid === puuid)!;

            totalKills += participant.kills;
            totalDeaths += participant.deaths;
            totalAssists += participant.assists;
            totalCS += participant.totalMinionsKilled + participant.neutralMinionsKilled;
            totalVision += participant.visionScore;
            totalDamage += participant.totalDamageDealtToChampions;
            totalGold += participant.goldEarned;
            totalGameTime += match.info.gameDuration;

            if (participant.win) wins++;
            if (participant.firstBloodKill) firstBloods++;
            if (participant.pentaKills > 0) pentaKills += participant.pentaKills;

            // Track positions
            const pos = participant.teamPosition || 'UNKNOWN';
            positionCounts[pos] = (positionCounts[pos] || 0) + 1;

            matchDetails.push({
                matchId: match.metadata.matchId,
                result: participant.win ? 'Win' : 'Loss',
                kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
                cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
                damage: participant.totalDamageDealtToChampions,
                gold: participant.goldEarned,
                vision: participant.visionScore,
                position: POSITIONS[participant.teamPosition] || participant.teamPosition,
                duration: `${Math.floor(match.info.gameDuration / 60)}min`,
                date: new Date(match.info.gameCreation).toLocaleDateString(),
            });
        }

        const gamesPlayed = championMatches.length;
        const avgMinutes = totalGameTime / gamesPlayed / 60;
        const kda = totalDeaths === 0 ? 'Perfect' : ((totalKills + totalAssists) / totalDeaths).toFixed(2);

        // Get most played position
        const mostPlayedPosition = Object.entries(positionCounts)
            .sort((a, b) => b[1] - a[1])[0];

        // Generate champion-specific tips
        const tips: string[] = [];

        // Win rate tips
        const winRate = wins / gamesPlayed;
        if (winRate < 0.45) {
            tips.push(`Your win rate on ${championName} is below 45%. Consider watching guides or VODs of high-elo players.`);
        } else if (winRate >= 0.55) {
            tips.push(`Great win rate on ${championName}! This could be a pocket pick for ranked.`);
        }

        // CS tips
        const csPerMin = totalCS / (totalGameTime / 60);
        if (csPerMin < 5.5 && mostPlayedPosition && ['TOP', 'MIDDLE', 'BOTTOM'].includes(mostPlayedPosition[0])) {
            tips.push('Focus on improving CS - practice last-hitting in custom games.');
        }

        // Death tips
        const deathsPerGame = totalDeaths / gamesPlayed;
        if (deathsPerGame > 6) {
            tips.push('High death count - work on positioning and map awareness.');
        }

        // Role-specific tips
        if (championData?.roles?.includes('Assassin') && totalKills / gamesPlayed < 5) {
            tips.push('As an assassin, focus on finding picks and eliminating priority targets.');
        }
        if (championData?.roles?.includes('Support') && totalVision / gamesPlayed < 25) {
            tips.push('As a support, prioritize vision control - aim for higher ward scores.');
        }

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    player: `${account.gameName}#${account.tagLine}`,
                    champion: {
                        name: championData?.name || championName,
                        title: championData?.title,
                        roles: championData?.roles,
                        imageUrl: championData?.imageUrl,
                    },
                    gamesAnalyzed: gamesPlayed,
                    stats: {
                        winRate: ((wins / gamesPlayed) * 100).toFixed(0) + '%',
                        record: `${wins}W - ${gamesPlayed - wins}L`,
                        avgKDA: kda,
                        avgKills: (totalKills / gamesPlayed).toFixed(1),
                        avgDeaths: (totalDeaths / gamesPlayed).toFixed(1),
                        avgAssists: (totalAssists / gamesPlayed).toFixed(1),
                        avgCS: (totalCS / gamesPlayed).toFixed(0),
                        avgCSPerMin: csPerMin.toFixed(1),
                        avgVisionScore: (totalVision / gamesPlayed).toFixed(0),
                        avgDamage: Math.round(totalDamage / gamesPlayed),
                        avgGold: Math.round(totalGold / gamesPlayed),
                        avgGameDuration: `${avgMinutes.toFixed(0)} minutes`,
                        firstBloodRate: ((firstBloods / gamesPlayed) * 100).toFixed(0) + '%',
                        pentaKills,
                    },
                    mostPlayedPosition: mostPlayedPosition ? {
                        position: POSITIONS[mostPlayedPosition[0]] || mostPlayedPosition[0],
                        games: mostPlayedPosition[1],
                    } : null,
                    recentMatches: matchDetails.slice(0, 5),
                    tips,
                }, null, 2),
            }],
        };
    },
};

// Export champion analysis tools
export const championTools = [
    lol_analyze_champion,
];
