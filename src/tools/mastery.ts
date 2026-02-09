import { z } from 'zod';
import { log } from 'apify';
import { GetChampionMasterySchema } from '../schemas/index.js';
import {
    getTopChampionMasteries,
    getTotalMasteryScore,
    getAccountByPuuid,
} from '../services/riot-client.js';
import { getChampionById } from '../services/data-dragon.js';
import { chargeForTool } from '../services/billing.js';
import type { Region, ToolResponse } from '../types/index.js';

/**
 * Format mastery points for display
 */
function formatMasteryPoints(points: number): string {
    if (points >= 1000000) {
        return `${(points / 1000000).toFixed(1)}M`;
    }
    if (points >= 1000) {
        return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toString();
}

/**
 * Get champion mastery tool
 */
export const lol_get_champion_mastery = {
    name: 'lol_get_champion_mastery',
    description: 'Get champion mastery information for a player. Returns top champions with mastery points, levels, and additional details like champion roles.',
    schema: GetChampionMasterySchema,
    handler: async (args: z.infer<typeof GetChampionMasterySchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_champion_mastery');
        const { puuid, top, region } = args;

        log.info(`Getting champion mastery for PUUID ${puuid.substring(0, 8)}... (top ${top}) in ${region}`);

        // Get account info for display
        const [masteries, totalScore, account] = await Promise.all([
            getTopChampionMasteries(puuid, top, region as Region),
            getTotalMasteryScore(puuid, region as Region),
            getAccountByPuuid(puuid, region as Region),
        ]);

        const formattedMasteries = masteries.map((m, index) => {
            const champion = getChampionById(m.championId);

            return {
                rank: index + 1,
                champion: {
                    id: m.championId,
                    name: champion?.name || `Champion ${m.championId}`,
                    title: champion?.title,
                    roles: champion?.roles,
                    imageUrl: champion?.imageUrl,
                },
                mastery: {
                    level: m.championLevel,
                    points: m.championPoints,
                    pointsFormatted: formatMasteryPoints(m.championPoints),
                    tokensEarned: m.tokensEarned,
                    chestGranted: m.chestGranted,
                },
                lastPlayed: new Date(m.lastPlayTime).toISOString(),
                lastPlayedRelative: getRelativeTime(m.lastPlayTime),
            };
        });

        // Group by roles
        const roleDistribution: Record<string, number> = {};
        formattedMasteries.forEach(m => {
            m.champion.roles?.forEach(role => {
                roleDistribution[role] = (roleDistribution[role] || 0) + 1;
            });
        });

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    player: `${account.gameName}#${account.tagLine}`,
                    totalMasteryScore: totalScore,
                    totalMasteryFormatted: formatMasteryPoints(totalScore),
                    topChampions: formattedMasteries,
                    rolePreference: Object.entries(roleDistribution)
                        .sort((a, b) => b[1] - a[1])
                        .map(([role, count]) => ({ role, count })),
                    insights: generateMasteryInsights(formattedMasteries, totalScore),
                }, null, 2),
            }],
        };
    },
};

/**
 * Get relative time string
 */
function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
        return `${Math.floor(days / 30)} month(s) ago`;
    }
    if (days > 0) {
        return `${days} day(s) ago`;
    }
    if (hours > 0) {
        return `${hours} hour(s) ago`;
    }
    return `${minutes} minute(s) ago`;
}

/**
 * Generate mastery insights
 */
function generateMasteryInsights(
    masteries: any[],
    totalScore: number
): string[] {
    const insights: string[] = [];

    // Total mastery insight
    if (totalScore > 500) {
        insights.push(`High total mastery score (${formatMasteryPoints(totalScore)}) indicates an experienced player`);
    }

    // Champion pool size
    const highMastery = masteries.filter(m => m.mastery.level >= 5).length;
    if (highMastery >= 5) {
        insights.push(`${highMastery} champions at mastery 5+ shows a diverse champion pool`);
    } else if (highMastery <= 2) {
        insights.push(`Only ${highMastery} high-mastery champions - consider expanding your pool`);
    }

    // One-trick detection
    if (masteries.length > 0) {
        const topChampPoints = masteries[0].mastery.points;
        const secondChampPoints = masteries[1]?.mastery.points || 0;

        if (topChampPoints > secondChampPoints * 3 && topChampPoints > 100000) {
            insights.push(`Strong ${masteries[0].champion.name} specialist (one-trick potential)`);
        }
    }

    // Recent activity
    const recentlyPlayed = masteries.filter(m => {
        const daysSinceLastPlayed = (Date.now() - new Date(m.lastPlayed).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastPlayed < 7;
    });

    if (recentlyPlayed.length >= 3) {
        insights.push(`Active on ${recentlyPlayed.length} different champions this week`);
    }

    // Role preference
    const roles = masteries.flatMap(m => m.champion.roles || []);
    const roleCounts: Record<string, number> = {};
    roles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0];
    if (topRole && topRole[1] >= 4) {
        insights.push(`Shows preference for ${topRole[0]} champions`);
    }

    return insights;
}

// Export all mastery tools
export const masteryTools = [
    lol_get_champion_mastery,
];
