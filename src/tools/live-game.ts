import { z } from 'zod';
import { log } from 'apify';
import { GetLiveGameSchema } from '../schemas/index.js';
import { getCurrentGame, getAccountByPuuid } from '../services/riot-client.js';
import {
    getChampionById,
    getSummonerSpellById,
    getRuneById,
} from '../services/data-dragon.js';
import { chargeForTool } from '../services/billing.js';
import { QUEUE_TYPES } from '../constants/index.js';
import type { Region, ToolResponse } from '../types/index.js';

/**
 * Get live game tool
 */
export const lol_get_live_game = {
    name: 'lol_get_live_game',
    description: 'Check if a player is currently in a game and get live game details including all participants, champions, runes, and summoner spells.',
    schema: GetLiveGameSchema,
    handler: async (args: z.infer<typeof GetLiveGameSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_live_game');
        const { puuid, region } = args;

        log.info(`Checking live game for PUUID ${puuid.substring(0, 8)}... in ${region}`);

        // Get account info for display
        const account = await getAccountByPuuid(puuid, region as Region);
        const game = await getCurrentGame(puuid, region as Region);

        if (!game) {
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({
                        inGame: false,
                        player: `${account.gameName}#${account.tagLine}`,
                        message: 'Player is not currently in a game.',
                    }, null, 2),
                }],
            };
        }

        const queueName = QUEUE_TYPES[game.gameQueueConfigId] || `Queue ${game.gameQueueConfigId}`;
        const gameLength = Math.floor(game.gameLength / 60);
        const startTime = new Date(game.gameStartTime).toISOString();

        // Format participants by team
        const blueTeam = game.participants.filter(p => p.teamId === 100);
        const redTeam = game.participants.filter(p => p.teamId === 200);

        const formatParticipant = (p: typeof game.participants[0]) => {
            const champion = getChampionById(p.championId);
            const spell1 = getSummonerSpellById(p.spell1Id);
            const spell2 = getSummonerSpellById(p.spell2Id);

            // Get keystone rune
            const keystoneId = p.perks?.perkIds?.[0];
            const keystone = keystoneId ? getRuneById(keystoneId) : null;

            // Get rune tree
            const primaryTree = p.perks?.perkStyle ? getRuneById(p.perks.perkStyle) : null;
            const secondaryTree = p.perks?.perkSubStyle ? getRuneById(p.perks.perkSubStyle) : null;

            return {
                riotId: p.riotId || 'Unknown',
                puuid: p.puuid,
                champion: {
                    id: p.championId,
                    name: champion?.name || `Champion ${p.championId}`,
                    roles: champion?.roles,
                    imageUrl: champion?.imageUrl,
                },
                summonerSpells: [spell1?.name, spell2?.name].filter(Boolean),
                runes: {
                    keystone: keystone?.name,
                    primaryTree: primaryTree?.name,
                    secondaryTree: secondaryTree?.name,
                },
                isBot: p.bot,
                isTargetPlayer: p.puuid === puuid,
            };
        };

        // Format bans by team
        const blueBans = game.bannedChampions
            .filter(b => b.teamId === 100)
            .map(b => getChampionById(b.championId)?.name || `Champion ${b.championId}`);

        const redBans = game.bannedChampions
            .filter(b => b.teamId === 200)
            .map(b => getChampionById(b.championId)?.name || `Champion ${b.championId}`);

        // Find target player
        const targetPlayer = game.participants.find(p => p.puuid === puuid);
        const targetChampion = targetPlayer ? getChampionById(targetPlayer.championId) : null;

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    inGame: true,
                    player: `${account.gameName}#${account.tagLine}`,
                    playingAs: targetChampion?.name || 'Unknown',
                    gameInfo: {
                        gameId: game.gameId,
                        queueType: queueName,
                        gameMode: game.gameMode,
                        gameLength: `${gameLength} minutes`,
                        startTime,
                    },
                    teams: {
                        blue: {
                            participants: blueTeam.map(formatParticipant),
                            bans: blueBans,
                        },
                        red: {
                            participants: redTeam.map(formatParticipant),
                            bans: redBans,
                        },
                    },
                    tips: generateLiveGameTips(game, puuid),
                }, null, 2),
            }],
        };
    },
};

/**
 * Generate tips based on live game data
 */
function generateLiveGameTips(
    game: any,
    targetPuuid: string
): string[] {
    const tips: string[] = [];

    const targetPlayer = game.participants.find((p: any) => p.puuid === targetPuuid);
    if (!targetPlayer) return tips;

    const targetChampion = getChampionById(targetPlayer.championId);
    const targetTeam = targetPlayer.teamId;

    // Analyze enemy team composition
    const enemies = game.participants.filter((p: any) => p.teamId !== targetTeam);
    const enemyRoles: Record<string, number> = {};

    enemies.forEach((p: any) => {
        const champ = getChampionById(p.championId);
        champ?.roles?.forEach(role => {
            enemyRoles[role] = (enemyRoles[role] || 0) + 1;
        });
    });

    // Team comp tips
    if (enemyRoles['Assassin'] >= 2) {
        tips.push('Enemy team has multiple assassins - consider grouping and playing safe');
    }

    if (enemyRoles['Tank'] >= 2) {
        tips.push('Enemy team is tanky - prioritize anti-tank items or %HP damage');
    }

    if (enemyRoles['Mage'] >= 3) {
        tips.push('Heavy AP enemy team - consider building Magic Resist');
    }

    // Check for specific threats
    const threatChampions = ['Zed', 'Katarina', 'Talon', 'Fizz', 'LeBlanc', 'Akali'];
    const threats = enemies.filter((p: any) => {
        const champ = getChampionById(p.championId);
        return threatChampions.includes(champ?.name || '');
    });

    if (threats.length > 0) {
        const threatNames = threats.map((p: any) => getChampionById(p.championId)?.name).filter(Boolean);
        tips.push(`Watch out for ${threatNames.join(', ')} - they can burst you quickly`);
    }

    // General tips based on game time
    const gameMinutes = game.gameLength / 60;
    if (gameMinutes < 5) {
        tips.push('Early game - focus on CS and trading carefully');
    } else if (gameMinutes < 15) {
        tips.push('Mid game - look for objective opportunities and roams');
    } else {
        tips.push('Late game - group with team and contest major objectives');
    }

    return tips;
}

// Export all live game tools
export const liveGameTools = [
    lol_get_live_game,
];
