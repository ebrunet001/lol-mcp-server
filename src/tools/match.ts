import { z } from 'zod';
import { log } from 'apify';
import {
    GetMatchHistorySchema,
    GetMatchDetailsSchema,
    GetMatchTimelineSchema,
} from '../schemas/index.js';
import {
    getMatchIds,
    getMatch,
    getMatchTimeline,
} from '../services/riot-client.js';
import {
    getChampionById,
    getItemById,
    getSummonerSpellById,
    getRuneById,
} from '../services/data-dragon.js';
import { chargeForTool } from '../services/billing.js';
import { QUEUE_TYPES, POSITIONS } from '../constants/index.js';
import type { Region, Participant, ToolResponse } from '../types/index.js';

/**
 * Format participant data with resolved names
 */
function formatParticipant(p: Participant) {
    const position = POSITIONS[p.teamPosition] || p.teamPosition || 'Unknown';
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;

    // Resolve champion
    const champion = getChampionById(p.championId);

    // Resolve items
    const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6]
        .map(id => getItemById(id))
        .filter(item => item !== null)
        .map(item => item!.name);

    // Resolve summoner spells
    const spell1 = getSummonerSpellById(p.summoner1Id);
    const spell2 = getSummonerSpellById(p.summoner2Id);

    // Resolve primary rune
    const primaryRune = p.perks?.styles?.[0]?.selections?.[0]?.perk
        ? getRuneById(p.perks.styles[0].selections[0].perk)
        : null;

    return {
        riotId: p.riotIdGameName ? `${p.riotIdGameName}#${p.riotIdTagline}` : p.summonerName,
        puuid: p.puuid,
        champion: {
            name: champion?.name || p.championName,
            title: champion?.title,
            roles: champion?.roles,
        },
        position,
        kda: {
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            ratio: p.deaths === 0 ? 'Perfect' : ((p.kills + p.assists) / p.deaths).toFixed(2),
        },
        cs: {
            total: cs,
            perMin: (cs / (p.timePlayed / 60)).toFixed(1),
        },
        gold: p.goldEarned,
        damage: p.totalDamageDealtToChampions,
        vision: {
            score: p.visionScore,
            wardsPlaced: p.wardsPlaced,
            wardsKilled: p.wardsKilled,
            controlWardsBought: p.visionWardsBoughtInGame,
        },
        items,
        summonerSpells: [spell1?.name, spell2?.name].filter(Boolean),
        keystone: primaryRune?.name,
        multiKills: {
            double: p.doubleKills,
            triple: p.tripleKills,
            quadra: p.quadraKills,
            penta: p.pentaKills,
        },
        win: p.win,
    };
}

/**
 * Get match history tool
 */
export const lol_get_match_history = {
    name: 'lol_get_match_history',
    description: 'Get recent match IDs for a player. Use lol_get_match_details to get details of each match.',
    schema: GetMatchHistorySchema,
    handler: async (args: z.infer<typeof GetMatchHistorySchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_match_history');
        const { puuid, count, queueType, region } = args;

        log.info(`Getting match history for PUUID ${puuid.substring(0, 8)}... (${count} matches) in ${region}`);

        const options: any = { count };
        if (queueType === 'ranked') {
            options.queue = 420; // Ranked Solo/Duo
        } else if (queueType === 'normal') {
            options.queue = 400; // Normal Draft
        }

        const matchIds = await getMatchIds(puuid, options, region as Region);

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    matchIds,
                    count: matchIds.length,
                    message: `Found ${matchIds.length} matches. Use lol_get_match_details with a matchId to get full details.`,
                }, null, 2),
            }],
        };
    },
};

/**
 * Get match details tool
 */
export const lol_get_match_details = {
    name: 'lol_get_match_details',
    description: 'Get detailed information about a specific match by match ID. Includes resolved champion names, items, and runes.',
    schema: GetMatchDetailsSchema,
    handler: async (args: z.infer<typeof GetMatchDetailsSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_match_details');
        const { matchId, region } = args;

        log.info(`Getting match details for ${matchId} in ${region}`);
        const match = await getMatch(matchId, region as Region);

        const queueName = QUEUE_TYPES[match.info.queueId] || `Queue ${match.info.queueId}`;
        const duration = Math.floor(match.info.gameDuration / 60);
        const gameDate = new Date(match.info.gameCreation).toISOString();

        // Format participants by team
        const blueTeam = match.info.participants.filter(p => p.teamId === 100);
        const redTeam = match.info.participants.filter(p => p.teamId === 200);

        // Team objectives
        const blueObjectives = match.info.teams.find(t => t.teamId === 100)?.objectives;
        const redObjectives = match.info.teams.find(t => t.teamId === 200)?.objectives;

        const blueWin = blueTeam[0]?.win || false;

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    matchId: match.metadata.matchId,
                    gameMode: match.info.gameMode,
                    queueType: queueName,
                    gameDuration: `${duration} minutes`,
                    gameDate,
                    patch: match.info.gameVersion.split('.').slice(0, 2).join('.'),
                    result: {
                        blueTeamWon: blueWin,
                        redTeamWon: !blueWin,
                    },
                    teams: {
                        blue: {
                            won: blueWin,
                            objectives: blueObjectives ? {
                                dragons: blueObjectives.dragon.kills,
                                barons: blueObjectives.baron.kills,
                                heralds: blueObjectives.riftHerald.kills,
                                towers: blueObjectives.tower.kills,
                            } : null,
                            participants: blueTeam.map(formatParticipant),
                        },
                        red: {
                            won: !blueWin,
                            objectives: redObjectives ? {
                                dragons: redObjectives.dragon.kills,
                                barons: redObjectives.baron.kills,
                                heralds: redObjectives.riftHerald.kills,
                                towers: redObjectives.tower.kills,
                            } : null,
                            participants: redTeam.map(formatParticipant),
                        },
                    },
                }, null, 2),
            }],
        };
    },
};

/**
 * Get match timeline tool
 */
export const lol_get_match_timeline = {
    name: 'lol_get_match_timeline',
    description: 'Get detailed timeline data for a match. Includes gold differences, kills, objectives at each minute.',
    schema: GetMatchTimelineSchema,
    handler: async (args: z.infer<typeof GetMatchTimelineSchema>): Promise<ToolResponse> => {
        await chargeForTool('lol_get_match_timeline');
        const { matchId, region } = args;

        log.info(`Getting match timeline for ${matchId} in ${region}`);

        // Get both match and timeline data
        const [match, timeline] = await Promise.all([
            getMatch(matchId, region as Region),
            getMatchTimeline(matchId, region as Region),
        ]);

        // Build participant lookup
        const participantLookup = new Map<number, { name: string; champion: string; team: number }>();
        match.info.participants.forEach((p, idx) => {
            participantLookup.set(idx + 1, {
                name: p.riotIdGameName || p.summonerName,
                champion: p.championName,
                team: p.teamId,
            });
        });

        // Process frames (sample every 5 minutes for brevity)
        const keyFrames = timeline.info.frames
            .filter((_, idx) => idx % 5 === 0 || idx === timeline.info.frames.length - 1)
            .map(frame => {
                const timestamp = Math.floor(frame.timestamp / 60000); // Convert to minutes

                // Calculate team gold
                let blueGold = 0;
                let redGold = 0;
                Object.entries(frame.participantFrames).forEach(([id, pf]) => {
                    const participant = participantLookup.get(parseInt(id));
                    if (participant?.team === 100) {
                        blueGold += pf.totalGold;
                    } else {
                        redGold += pf.totalGold;
                    }
                });

                return {
                    minute: timestamp,
                    goldDiff: blueGold - redGold,
                    blueGold,
                    redGold,
                };
            });

        // Extract key events
        const keyEvents = timeline.info.frames.flatMap(frame =>
            frame.events
                .filter(e => ['CHAMPION_KILL', 'ELITE_MONSTER_KILL', 'BUILDING_KILL'].includes(e.type))
                .map(e => {
                    const minute = Math.floor(e.timestamp / 60000);

                    if (e.type === 'CHAMPION_KILL') {
                        const killer = participantLookup.get(e.killerId || 0);
                        const victim = participantLookup.get(e.victimId || 0);
                        return {
                            minute,
                            type: 'kill',
                            description: `${killer?.champion || 'Unknown'} killed ${victim?.champion || 'Unknown'}`,
                            team: killer?.team === 100 ? 'blue' : 'red',
                        };
                    }

                    if (e.type === 'ELITE_MONSTER_KILL') {
                        const killer = participantLookup.get(e.killerId || 0);
                        const monster = e.monsterType === 'DRAGON' ? `${e.monsterSubType} Dragon` :
                                        e.monsterType === 'BARON_NASHOR' ? 'Baron' :
                                        e.monsterType === 'RIFTHERALD' ? 'Herald' :
                                        e.monsterType;
                        return {
                            minute,
                            type: 'objective',
                            description: `${killer?.team === 100 ? 'Blue' : 'Red'} team took ${monster}`,
                            team: killer?.team === 100 ? 'blue' : 'red',
                        };
                    }

                    if (e.type === 'BUILDING_KILL') {
                        const team = e.teamId === 100 ? 'red' : 'blue'; // Team that destroyed (opposite of building owner)
                        const building = e.buildingType === 'TOWER_BUILDING' ? `${e.laneType} ${e.towerType}` : 'Inhibitor';
                        return {
                            minute,
                            type: 'structure',
                            description: `${team.charAt(0).toUpperCase() + team.slice(1)} destroyed ${building}`,
                            team,
                        };
                    }

                    return null;
                })
                .filter(Boolean)
        );

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    matchId,
                    gameDuration: `${Math.floor(match.info.gameDuration / 60)} minutes`,
                    goldProgression: keyFrames,
                    keyEvents: keyEvents.slice(0, 30), // Limit to 30 events for readability
                    summary: {
                        finalGoldDiff: keyFrames[keyFrames.length - 1]?.goldDiff || 0,
                        blueTeamWon: match.info.participants.find(p => p.teamId === 100)?.win || false,
                    },
                }, null, 2),
            }],
        };
    },
};

// Export all match tools
export const matchTools = [
    lol_get_match_history,
    lol_get_match_details,
    lol_get_match_timeline,
];
