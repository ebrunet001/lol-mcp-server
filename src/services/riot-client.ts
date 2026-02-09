import { log } from 'apify';
import { REGION_TO_ROUTE } from '../constants/index.js';
import { cacheGet, cacheSet } from './cache.js';
import { withRetry } from './rate-limiter.js';
import type {
    Region,
    RegionalRoute,
    RiotAccount,
    Summoner,
    LeagueEntry,
    ChampionMastery,
    Match,
    MatchTimeline,
    CurrentGameInfo,
} from '../types/index.js';

let riotApiKey: string | null = null;
let defaultRegion: Region = 'euw1';

/**
 * Initialize the Riot API client
 */
export function initRiotClient(apiKey: string, region: Region = 'euw1'): void {
    riotApiKey = apiKey;
    defaultRegion = region;
    log.info(`Riot API client initialized for region: ${region}`);
}

/**
 * Get the current API key
 */
export function getApiKey(): string {
    if (!riotApiKey) {
        throw new Error('Riot API client not initialized. Call initRiotClient first.');
    }
    return riotApiKey;
}

/**
 * Get the regional route for a given region
 */
export function getRegionalRoute(region: Region): RegionalRoute {
    return REGION_TO_ROUTE[region];
}

/**
 * Make a request to the Riot API
 */
async function riotFetch<T>(url: string, priority: number = 0): Promise<T> {
    const apiKey = getApiKey();

    return withRetry(async () => {
        const response = await fetch(url, {
            headers: {
                'X-Riot-Token': apiKey,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            log.error(`Riot API error: ${response.status} - ${errorBody}`);

            if (response.status === 401) {
                throw new Error('Invalid Riot API key');
            }
            if (response.status === 403) {
                throw new Error('Riot API key does not have access to this endpoint');
            }
            if (response.status === 404) {
                throw new Error('Resource not found');
            }
            if (response.status === 429) {
                throw new Error('Rate limit exceeded (429)');
            }

            throw new Error(`Riot API error: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }, 3, priority);
}

// =============================================================================
// ACCOUNT API (Regional Routes)
// =============================================================================

/**
 * Get account by Riot ID (gameName#tagLine)
 */
export async function getAccountByRiotId(
    gameName: string,
    tagLine: string,
    region: Region = defaultRegion
): Promise<RiotAccount> {
    const cacheKey = `account:${gameName}#${tagLine}:${region}`;

    // Check cache
    const cached = cacheGet<RiotAccount>('playerProfile', cacheKey);
    if (cached) return cached;

    const route = getRegionalRoute(region);
    const url = `https://${route}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    const account = await riotFetch<RiotAccount>(url);

    cacheSet('playerProfile', cacheKey, account);
    return account;
}

/**
 * Get account by PUUID
 */
export async function getAccountByPuuid(
    puuid: string,
    region: Region = defaultRegion
): Promise<RiotAccount> {
    const cacheKey = `account:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<RiotAccount>('playerProfile', cacheKey);
    if (cached) return cached;

    const route = getRegionalRoute(region);
    const url = `https://${route}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;

    const account = await riotFetch<RiotAccount>(url);

    cacheSet('playerProfile', cacheKey, account);
    return account;
}

// =============================================================================
// SUMMONER API (Platform Routes)
// =============================================================================

/**
 * Get summoner by PUUID
 */
export async function getSummonerByPuuid(
    puuid: string,
    region: Region = defaultRegion
): Promise<Summoner> {
    const cacheKey = `summoner:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<Summoner>('playerProfile', cacheKey);
    if (cached) return cached;

    const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;

    const summoner = await riotFetch<Summoner>(url);

    cacheSet('playerProfile', cacheKey, summoner);
    return summoner;
}

// =============================================================================
// LEAGUE API (Ranked)
// =============================================================================

/**
 * Get ranked entries for a player by PUUID
 */
export async function getRankedEntries(
    puuid: string,
    region: Region = defaultRegion
): Promise<LeagueEntry[]> {
    const cacheKey = `ranked:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<LeagueEntry[]>('rankedInfo', cacheKey);
    if (cached) return cached;

    const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;

    const entries = await riotFetch<LeagueEntry[]>(url);

    cacheSet('rankedInfo', cacheKey, entries);
    return entries;
}

// =============================================================================
// CHAMPION MASTERY API
// =============================================================================

/**
 * Get all champion masteries for a player
 */
export async function getChampionMasteries(
    puuid: string,
    region: Region = defaultRegion
): Promise<ChampionMastery[]> {
    const cacheKey = `mastery:all:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<ChampionMastery[]>('championMastery', cacheKey);
    if (cached) return cached;

    const url = `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;

    const masteries = await riotFetch<ChampionMastery[]>(url);

    cacheSet('championMastery', cacheKey, masteries);
    return masteries;
}

/**
 * Get top champion masteries
 */
export async function getTopChampionMasteries(
    puuid: string,
    count: number = 10,
    region: Region = defaultRegion
): Promise<ChampionMastery[]> {
    const cacheKey = `mastery:top${count}:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<ChampionMastery[]>('championMastery', cacheKey);
    if (cached) return cached;

    const url = `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`;

    const masteries = await riotFetch<ChampionMastery[]>(url);

    cacheSet('championMastery', cacheKey, masteries);
    return masteries;
}

/**
 * Get total mastery score
 */
export async function getTotalMasteryScore(
    puuid: string,
    region: Region = defaultRegion
): Promise<number> {
    const cacheKey = `mastery:score:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<number>('championMastery', cacheKey);
    if (cached !== undefined) return cached;

    const url = `https://${region}.api.riotgames.com/lol/champion-mastery/v4/scores/by-puuid/${puuid}`;

    const score = await riotFetch<number>(url);

    cacheSet('championMastery', cacheKey, score);
    return score;
}

// =============================================================================
// MATCH API (Regional Routes)
// =============================================================================

/**
 * Get list of match IDs for a player
 */
export async function getMatchIds(
    puuid: string,
    options: {
        startTime?: number;
        endTime?: number;
        queue?: number;
        type?: 'ranked' | 'normal' | 'tourney' | 'tutorial';
        start?: number;
        count?: number;
    } = {},
    region: Region = defaultRegion
): Promise<string[]> {
    // Build cache key from options
    const optionsKey = JSON.stringify(options);
    const cacheKey = `matchIds:${puuid}:${region}:${optionsKey}`;

    // Check cache
    const cached = cacheGet<string[]>('matchIds', cacheKey);
    if (cached) return cached;

    const route = getRegionalRoute(region);
    const params = new URLSearchParams();

    if (options.startTime) params.append('startTime', options.startTime.toString());
    if (options.endTime) params.append('endTime', options.endTime.toString());
    if (options.queue) params.append('queue', options.queue.toString());
    if (options.type) params.append('type', options.type);
    if (options.start !== undefined) params.append('start', options.start.toString());
    if (options.count) params.append('count', options.count.toString());

    const queryString = params.toString();
    const url = `https://${route}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids${queryString ? '?' + queryString : ''}`;

    const matchIds = await riotFetch<string[]>(url);

    cacheSet('matchIds', cacheKey, matchIds);
    return matchIds;
}

/**
 * Get match details by match ID
 */
export async function getMatch(
    matchId: string,
    region: Region = defaultRegion
): Promise<Match> {
    const cacheKey = `match:${matchId}`;

    // Check cache (matches are immutable, so we can cache indefinitely)
    const cached = cacheGet<Match>('matchDetails', cacheKey);
    if (cached) return cached;

    const route = getRegionalRoute(region);
    const url = `https://${route}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    const match = await riotFetch<Match>(url);

    cacheSet('matchDetails', cacheKey, match);
    return match;
}

/**
 * Get match timeline
 */
export async function getMatchTimeline(
    matchId: string,
    region: Region = defaultRegion
): Promise<MatchTimeline> {
    const cacheKey = `timeline:${matchId}`;

    // Check cache
    const cached = cacheGet<MatchTimeline>('matchDetails', cacheKey);
    if (cached) return cached;

    const route = getRegionalRoute(region);
    const url = `https://${route}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;

    const timeline = await riotFetch<MatchTimeline>(url);

    cacheSet('matchDetails', cacheKey, timeline);
    return timeline;
}

/**
 * Get multiple matches (with parallel fetching)
 */
export async function getMatches(
    matchIds: string[],
    region: Region = defaultRegion
): Promise<Match[]> {
    const matches: Match[] = [];

    // Fetch in batches of 10 to avoid overwhelming the rate limiter
    const batchSize = 10;

    for (let i = 0; i < matchIds.length; i += batchSize) {
        const batch = matchIds.slice(i, i + batchSize);

        const batchResults = await Promise.all(
            batch.map(async (matchId) => {
                try {
                    return await getMatch(matchId, region);
                } catch (error: any) {
                    log.warning(`Failed to fetch match ${matchId}: ${error.message}`);
                    return null;
                }
            })
        );

        matches.push(...batchResults.filter((m): m is Match => m !== null));
    }

    return matches;
}

// =============================================================================
// SPECTATOR API (Live Game)
// =============================================================================

/**
 * Get current game by PUUID (Spectator V5)
 */
export async function getCurrentGame(
    puuid: string,
    region: Region = defaultRegion
): Promise<CurrentGameInfo | null> {
    const cacheKey = `livegame:${puuid}:${region}`;

    // Check cache
    const cached = cacheGet<CurrentGameInfo | null>('liveGame', cacheKey);
    if (cached !== undefined) return cached;

    try {
        const url = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
        const game = await riotFetch<CurrentGameInfo>(url);

        cacheSet('liveGame', cacheKey, game);
        return game;
    } catch (error: any) {
        if (error.message.includes('404')) {
            // Player is not in a game
            cacheSet('liveGame', cacheKey, null);
            return null;
        }
        throw error;
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get complete player profile (account + summoner + ranked)
 */
export async function getPlayerProfile(
    gameName: string,
    tagLine: string,
    region: Region = defaultRegion
): Promise<{
    account: RiotAccount;
    summoner: Summoner;
    ranked: LeagueEntry[];
}> {
    const account = await getAccountByRiotId(gameName, tagLine, region);

    const [summoner, ranked] = await Promise.all([
        getSummonerByPuuid(account.puuid, region),
        getRankedEntries(account.puuid, region),
    ]);

    return { account, summoner, ranked };
}

/**
 * Get recent matches with details for a player
 */
export async function getRecentMatchesWithDetails(
    puuid: string,
    count: number = 10,
    queueType?: 'ranked' | 'normal',
    region: Region = defaultRegion
): Promise<Match[]> {
    const options: Parameters<typeof getMatchIds>[1] = {
        count,
    };

    if (queueType === 'ranked') {
        options.queue = 420; // Ranked Solo/Duo
    } else if (queueType === 'normal') {
        options.queue = 400; // Normal Draft
    }

    const matchIds = await getMatchIds(puuid, options, region);
    return getMatches(matchIds, region);
}
