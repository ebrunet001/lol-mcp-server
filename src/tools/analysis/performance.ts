import { z } from 'zod';
import { log } from 'apify';
import { AnalyzePerformanceSchema, GetImprovementTipsSchema } from '../../schemas/index.js';
import {
    getRecentMatchesWithDetails,
    getAccountByPuuid,
    getRankedEntries,
} from '../../services/riot-client.js';
import { chargeForTool } from '../../services/billing.js';
import {
    POSITIONS,
    getBenchmarksForTier,
    getMessages,
} from '../../constants/index.js';
import type { Region, Match, PlayerStats, ToolResponse, Language } from '../../types/index.js';

/**
 * Calculate player statistics from matches
 */
function calculatePlayerStats(matches: Match[], puuid: string): PlayerStats {
    const stats: PlayerStats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        totalCS: 0,
        totalVisionScore: 0,
        totalDamage: 0,
        totalGold: 0,
        totalGameTime: 0,
        positionStats: {},
        championStats: {},
    };

    for (const match of matches) {
        const participant = match.info.participants.find(p => p.puuid === puuid);
        if (!participant) continue;

        stats.gamesPlayed++;
        if (participant.win) stats.wins++;
        else stats.losses++;

        stats.totalKills += participant.kills;
        stats.totalDeaths += participant.deaths;
        stats.totalAssists += participant.assists;
        stats.totalCS += participant.totalMinionsKilled + participant.neutralMinionsKilled;
        stats.totalVisionScore += participant.visionScore;
        stats.totalDamage += participant.totalDamageDealtToChampions;
        stats.totalGold += participant.goldEarned;
        stats.totalGameTime += match.info.gameDuration;

        // Position stats
        const position = participant.teamPosition || 'UNKNOWN';
        if (!stats.positionStats[position]) {
            stats.positionStats[position] = { games: 0, wins: 0 };
        }
        stats.positionStats[position].games++;
        if (participant.win) stats.positionStats[position].wins++;

        // Champion stats
        const champion = participant.championName;
        if (!stats.championStats[champion]) {
            stats.championStats[champion] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, damage: 0 };
        }
        stats.championStats[champion].games++;
        if (participant.win) stats.championStats[champion].wins++;
        stats.championStats[champion].kills += participant.kills;
        stats.championStats[champion].deaths += participant.deaths;
        stats.championStats[champion].assists += participant.assists;
        stats.championStats[champion].cs += participant.totalMinionsKilled + participant.neutralMinionsKilled;
        stats.championStats[champion].damage += participant.totalDamageDealtToChampions;
    }

    return stats;
}

/**
 * Analyze performance and generate insights
 */
function analyzePerformance(stats: PlayerStats, tier: string | undefined, lang: Language = 'en') {
    const messages = getMessages(lang);
    const benchmarks = getBenchmarksForTier(tier);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    const winRate = stats.wins / stats.gamesPlayed;
    const avgKDA = stats.totalDeaths === 0
        ? (stats.totalKills + stats.totalAssists)
        : (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
    const avgCSPerMin = stats.totalCS / (stats.totalGameTime / 60);
    const avgVisionPerMin = stats.totalVisionScore / (stats.totalGameTime / 60);
    const avgDeathsPerGame = stats.totalDeaths / stats.gamesPlayed;
    const avgDamagePerMin = stats.totalDamage / (stats.totalGameTime / 60);
    const avgGoldPerMin = stats.totalGold / (stats.totalGameTime / 60);

    // KDA Analysis
    if (avgKDA >= benchmarks.kda.excellent) {
        strengths.push(messages.strengths.highKDA);
    } else if (avgKDA < benchmarks.kda.poor) {
        weaknesses.push(messages.weaknesses.lowKDA);
        recommendations.push(messages.recommendations.reviewDeaths);
    }

    // CS Analysis
    if (avgCSPerMin >= benchmarks.csPerMin.good) {
        strengths.push(messages.strengths.goodCS);
    } else if (avgCSPerMin < benchmarks.csPerMin.poor) {
        weaknesses.push(messages.weaknesses.poorCS);
        recommendations.push(messages.recommendations.practiceCS);
    }

    // Vision Analysis
    if (avgVisionPerMin >= benchmarks.visionPerMin.good) {
        strengths.push(messages.strengths.greatVision);
    } else if (avgVisionPerMin < benchmarks.visionPerMin.poor) {
        weaknesses.push(messages.weaknesses.lowVision);
        recommendations.push(messages.recommendations.wardMore);
    }

    // Deaths Analysis
    if (avgDeathsPerGame > benchmarks.deathsPerGame.high) {
        weaknesses.push(messages.weaknesses.tooManyDeaths);
        recommendations.push(messages.recommendations.watchMap);
    } else if (avgDeathsPerGame < benchmarks.deathsPerGame.acceptable * 0.7) {
        strengths.push(messages.strengths.lowDeaths);
    }

    // Win Rate Analysis
    if (winRate >= 0.55) {
        strengths.push(messages.strengths.consistentWins);
    }

    // Champion pool analysis
    const uniqueChampions = Object.keys(stats.championStats).length;
    if (uniqueChampions > stats.gamesPlayed * 0.5) {
        recommendations.push(messages.recommendations.playChampionPool);
    }

    return {
        strengths,
        weaknesses,
        recommendations,
        metrics: {
            winRate: (winRate * 100).toFixed(1) + '%',
            avgKDA: avgKDA.toFixed(2),
            avgCSPerMin: avgCSPerMin.toFixed(1),
            avgVisionPerMin: avgVisionPerMin.toFixed(2),
            avgDeathsPerGame: avgDeathsPerGame.toFixed(1),
            avgDamagePerMin: Math.round(avgDamagePerMin).toString(),
            avgGoldPerMin: Math.round(avgGoldPerMin).toString(),
        },
    };
}

/**
 * Performance analysis tool
 */
export const lol_analyze_performance = {
    name: 'lol_analyze_performance',
    description: 'Analyze a player\'s recent performance and provide improvement recommendations. Returns statistics, strengths, weaknesses, and actionable tips based on their rank.',
    schema: AnalyzePerformanceSchema,
    handler: async (args: z.infer<typeof AnalyzePerformanceSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_analyze_performance');
        const { puuid, matchCount, queueType, region, language } = args;

        log.info(`Analyzing performance for PUUID ${puuid.substring(0, 8)}... (${matchCount} matches) in ${region}`);

        // Get account and ranked info for context
        const [account, rankedEntries] = await Promise.all([
            getAccountByPuuid(puuid, region as Region),
            getRankedEntries(puuid, region as Region),
        ]);

        // Get player's tier for benchmarks
        const soloQueue = rankedEntries.find(e => e.queueType === 'RANKED_SOLO_5x5');
        const playerTier = soloQueue?.tier;

        // Get recent matches
        const queueFilter = queueType === 'ranked' ? 'ranked' : queueType === 'normal' ? 'normal' : undefined;
        const matches = await getRecentMatchesWithDetails(puuid, matchCount, queueFilter, region as Region);

        if (matches.length === 0) {
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({
                        error: 'No matches found for analysis.',
                        message: 'The player has no recent matches in the selected queue type.',
                        player: `${account.gameName}#${account.tagLine}`,
                    }, null, 2),
                }],
            };
        }

        // Calculate stats
        const stats = calculatePlayerStats(matches, puuid);
        const analysis = analyzePerformance(stats, playerTier, language as Language);

        // Get most played position
        const mostPlayedPosition = Object.entries(stats.positionStats)
            .sort((a, b) => b[1].games - a[1].games)[0];

        // Get best champions
        const bestChampions = Object.entries(stats.championStats)
            .filter(([_, s]) => s.games >= 2)
            .map(([name, s]) => ({
                champion: name,
                games: s.games,
                winRate: ((s.wins / s.games) * 100).toFixed(0) + '%',
                kda: s.deaths === 0 ? 'Perfect' : ((s.kills + s.assists) / s.deaths).toFixed(2),
                avgCS: Math.round(s.cs / s.games),
                avgDamage: Math.round(s.damage / s.games),
            }))
            .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
            .slice(0, 5);

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    player: `${account.gameName}#${account.tagLine}`,
                    rank: playerTier ? `${soloQueue.tier} ${soloQueue.rank}` : 'Unranked',
                    gamesAnalyzed: stats.gamesPlayed,
                    overallStats: {
                        winRate: analysis.metrics.winRate,
                        record: `${stats.wins}W - ${stats.losses}L`,
                        avgKDA: analysis.metrics.avgKDA,
                        avgKills: (stats.totalKills / stats.gamesPlayed).toFixed(1),
                        avgDeaths: analysis.metrics.avgDeathsPerGame,
                        avgAssists: (stats.totalAssists / stats.gamesPlayed).toFixed(1),
                        avgCSPerMin: analysis.metrics.avgCSPerMin,
                        avgVisionPerMin: analysis.metrics.avgVisionPerMin,
                        avgDamagePerMin: analysis.metrics.avgDamagePerMin,
                        avgGoldPerMin: analysis.metrics.avgGoldPerMin,
                    },
                    mostPlayedRole: mostPlayedPosition ? {
                        position: POSITIONS[mostPlayedPosition[0]] || mostPlayedPosition[0],
                        games: mostPlayedPosition[1].games,
                        winRate: ((mostPlayedPosition[1].wins / mostPlayedPosition[1].games) * 100).toFixed(0) + '%',
                    } : null,
                    bestChampions,
                    analysis: {
                        strengths: analysis.strengths,
                        weaknesses: analysis.weaknesses,
                        recommendations: analysis.recommendations,
                    },
                    benchmarksUsed: playerTier || 'GOLD',
                }, null, 2),
            }],
        };
    },
};

/**
 * Get improvement tips tool
 */
export const lol_get_improvement_tips = {
    name: 'lol_get_improvement_tips',
    description: 'Get personalized improvement tips based on recent match analysis. Provides specific, actionable advice with current vs target values.',
    schema: GetImprovementTipsSchema,
    handler: async (args: z.infer<typeof GetImprovementTipsSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_improvement_tips');
        const { puuid, matchCount, queueType, region, language } = args;

        log.info(`Getting improvement tips for PUUID ${puuid.substring(0, 8)}... in ${region}`);

        const [account, rankedEntries] = await Promise.all([
            getAccountByPuuid(puuid, region as Region),
            getRankedEntries(puuid, region as Region),
        ]);

        const soloQueue = rankedEntries.find(e => e.queueType === 'RANKED_SOLO_5x5');
        const playerTier = soloQueue?.tier;
        const benchmarks = getBenchmarksForTier(playerTier);
        const messages = getMessages(language as Language);

        const queueFilter = queueType === 'ranked' ? 'ranked' : queueType === 'normal' ? 'normal' : undefined;
        const matches = await getRecentMatchesWithDetails(puuid, matchCount, queueFilter, region as Region);

        if (matches.length < 5) {
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({
                        error: 'Not enough matches for analysis',
                        message: 'At least 5 matches are needed to provide meaningful tips.',
                        matchesFound: matches.length,
                    }, null, 2),
                }],
            };
        }

        const stats = calculatePlayerStats(matches, puuid);
        const avgMinutes = stats.totalGameTime / stats.gamesPlayed / 60;

        // Detailed tips based on specific metrics
        const tips: { category: string; priority: 'high' | 'medium' | 'low'; tip: string; currentValue: string; targetValue: string }[] = [];

        // Deaths analysis
        const deathsPerGame = stats.totalDeaths / stats.gamesPlayed;
        if (deathsPerGame > benchmarks.deathsPerGame.high) {
            tips.push({
                category: 'Survivability',
                priority: 'high',
                tip: messages.recommendations.reviewDeaths,
                currentValue: `${deathsPerGame.toFixed(1)} deaths/game`,
                targetValue: `< ${benchmarks.deathsPerGame.acceptable} deaths/game`,
            });
        }

        // CS analysis
        const csPerMin = stats.totalCS / (stats.totalGameTime / 60);
        if (csPerMin < benchmarks.csPerMin.average) {
            tips.push({
                category: 'Farming',
                priority: 'high',
                tip: messages.recommendations.practiceCS,
                currentValue: `${csPerMin.toFixed(1)} CS/min`,
                targetValue: `> ${benchmarks.csPerMin.good} CS/min`,
            });
        }

        // Vision analysis
        const visionPerMin = stats.totalVisionScore / (stats.totalGameTime / 60);
        if (visionPerMin < benchmarks.visionPerMin.average) {
            tips.push({
                category: 'Vision',
                priority: 'medium',
                tip: messages.recommendations.wardMore,
                currentValue: `${visionPerMin.toFixed(2)} vision/min`,
                targetValue: `> ${benchmarks.visionPerMin.good} vision/min`,
            });
        }

        // KDA analysis
        const kda = stats.totalDeaths === 0
            ? stats.totalKills + stats.totalAssists
            : (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
        if (kda < benchmarks.kda.average) {
            tips.push({
                category: 'KDA',
                priority: 'high',
                tip: messages.recommendations.reviewDeaths,
                currentValue: `${kda.toFixed(2)} KDA`,
                targetValue: `> ${benchmarks.kda.good} KDA`,
            });
        }

        // Champion pool analysis
        const uniqueChampions = Object.keys(stats.championStats).length;
        if (uniqueChampions > stats.gamesPlayed * 0.6) {
            tips.push({
                category: 'Champion Pool',
                priority: 'medium',
                tip: messages.recommendations.playChampionPool,
                currentValue: `${uniqueChampions} different champions`,
                targetValue: '2-3 main champions',
            });
        }

        // Win rate by position
        for (const [position, posStats] of Object.entries(stats.positionStats)) {
            if (posStats.games >= 3) {
                const winRate = posStats.wins / posStats.games;
                if (winRate < 0.4) {
                    const posName = POSITIONS[position] || position;
                    tips.push({
                        category: `${posName} Performance`,
                        priority: 'medium',
                        tip: messages.recommendations.learnMatchups,
                        currentValue: `${(winRate * 100).toFixed(0)}% win rate`,
                        targetValue: '> 50% win rate',
                    });
                }
            }
        }

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    player: `${account.gameName}#${account.tagLine}`,
                    rank: playerTier ? `${soloQueue.tier} ${soloQueue.rank}` : 'Unranked',
                    gamesAnalyzed: stats.gamesPlayed,
                    currentStats: {
                        winRate: ((stats.wins / stats.gamesPlayed) * 100).toFixed(0) + '%',
                        kda: kda.toFixed(2),
                        csPerMin: csPerMin.toFixed(1),
                        visionPerMin: visionPerMin.toFixed(2),
                        deathsPerGame: deathsPerGame.toFixed(1),
                    },
                    improvementTips: tips,
                    generalAdvice: messages.tips.general,
                    benchmarksUsed: playerTier || 'GOLD',
                }, null, 2),
            }],
        };
    },
};

// Export performance analysis tools
export const performanceTools = [
    lol_analyze_performance,
    lol_get_improvement_tips,
];
