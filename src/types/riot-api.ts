// ============================================================================
// Riot API Types
// ============================================================================

// Regions
export type Region =
    | 'euw1' | 'eun1' | 'na1' | 'kr' | 'br1' | 'la1' | 'la2'
    | 'oc1' | 'tr1' | 'ru' | 'jp1' | 'ph2' | 'sg2' | 'th2' | 'tw2' | 'vn2';

export type RegionalRoute = 'europe' | 'americas' | 'asia' | 'sea';

// Account
export interface RiotAccount {
    puuid: string;
    gameName: string;
    tagLine: string;
}

// Summoner
export interface Summoner {
    id: string;
    accountId: string;
    puuid: string;
    profileIconId: number;
    revisionDate: number;
    summonerLevel: number;
}

// Ranked
export interface LeagueEntry {
    leagueId: string;
    summonerId: string;
    puuid: string;
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    hotStreak: boolean;
    veteran: boolean;
    freshBlood: boolean;
    inactive: boolean;
}

// Champion Mastery
export interface ChampionMastery {
    puuid: string;
    championId: number;
    championLevel: number;
    championPoints: number;
    lastPlayTime: number;
    championPointsSinceLastLevel: number;
    championPointsUntilNextLevel: number;
    markRequiredForNextLevel: number;
    tokensEarned: number;
    championSeasonMilestone: number;
    chestGranted: boolean;
}

// Match
export interface Match {
    metadata: MatchMetadata;
    info: MatchInfo;
}

export interface MatchMetadata {
    dataVersion: string;
    matchId: string;
    participants: string[]; // PUUIDs
}

export interface MatchInfo {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: Participant[];
    platformId: string;
    queueId: number;
    teams: Team[];
    tournamentCode?: string;
}

export interface Participant {
    // Identity
    puuid: string;
    summonerId: string;
    summonerName: string;
    riotIdGameName: string;
    riotIdTagline: string;

    // Champion
    championId: number;
    championName: string;
    champLevel: number;

    // Position
    teamPosition: string;
    individualPosition: string;
    lane: string;
    role: string;
    teamId: number;

    // KDA
    kills: number;
    deaths: number;
    assists: number;

    // Damage
    totalDamageDealt: number;
    totalDamageDealtToChampions: number;
    totalDamageTaken: number;
    trueDamageDealt: number;
    trueDamageDealtToChampions: number;
    magicDamageDealt: number;
    magicDamageDealtToChampions: number;
    physicalDamageDealt: number;
    physicalDamageDealtToChampions: number;

    // Farm
    totalMinionsKilled: number;
    neutralMinionsKilled: number;

    // Gold
    goldEarned: number;
    goldSpent: number;

    // Vision
    visionScore: number;
    wardsPlaced: number;
    wardsKilled: number;
    visionWardsBoughtInGame: number;

    // Items
    item0: number;
    item1: number;
    item2: number;
    item3: number;
    item4: number;
    item5: number;
    item6: number;

    // Objectives
    dragonKills: number;
    baronKills: number;
    turretKills: number;
    turretTakedowns: number;
    inhibitorKills: number;
    inhibitorTakedowns: number;

    // Multi-kills
    doubleKills: number;
    tripleKills: number;
    quadraKills: number;
    pentaKills: number;

    // Misc
    firstBloodKill: boolean;
    firstBloodAssist: boolean;
    firstTowerKill: boolean;
    firstTowerAssist: boolean;
    win: boolean;

    // Spells & Runes
    summoner1Id: number;
    summoner2Id: number;
    perks: Perks;

    // Timeline
    timePlayed: number;
    longestTimeSpentLiving: number;
    totalTimeSpentDead: number;
}

export interface Perks {
    statPerks: {
        defense: number;
        flex: number;
        offense: number;
    };
    styles: PerkStyle[];
}

export interface PerkStyle {
    description: string;
    selections: PerkSelection[];
    style: number;
}

export interface PerkSelection {
    perk: number;
    var1: number;
    var2: number;
    var3: number;
}

export interface Team {
    teamId: number;
    win: boolean;
    objectives: {
        baron: ObjectiveInfo;
        champion: ObjectiveInfo;
        dragon: ObjectiveInfo;
        horde: ObjectiveInfo;
        inhibitor: ObjectiveInfo;
        riftHerald: ObjectiveInfo;
        tower: ObjectiveInfo;
    };
    bans: Ban[];
}

export interface ObjectiveInfo {
    first: boolean;
    kills: number;
}

export interface Ban {
    championId: number;
    pickTurn: number;
}

// Match Timeline
export interface MatchTimeline {
    metadata: MatchMetadata;
    info: TimelineInfo;
}

export interface TimelineInfo {
    frameInterval: number;
    frames: TimelineFrame[];
    participants: TimelineParticipant[];
}

export interface TimelineFrame {
    timestamp: number;
    participantFrames: Record<string, ParticipantFrame>;
    events: TimelineEvent[];
}

export interface ParticipantFrame {
    participantId: number;
    position: { x: number; y: number };
    currentGold: number;
    totalGold: number;
    level: number;
    xp: number;
    minionsKilled: number;
    jungleMinionsKilled: number;
    damageStats: {
        totalDamageDone: number;
        totalDamageDoneToChampions: number;
        totalDamageTaken: number;
    };
}

export interface TimelineEvent {
    type: string;
    timestamp: number;
    participantId?: number;
    killerId?: number;
    victimId?: number;
    assistingParticipantIds?: number[];
    position?: { x: number; y: number };
    itemId?: number;
    skillSlot?: number;
    levelUpType?: string;
    wardType?: string;
    monsterType?: string;
    monsterSubType?: string;
    buildingType?: string;
    laneType?: string;
    towerType?: string;
    teamId?: number;
}

export interface TimelineParticipant {
    participantId: number;
    puuid: string;
}

// Spectator (Live Game)
export interface CurrentGameInfo {
    gameId: number;
    gameType: string;
    gameStartTime: number;
    mapId: number;
    gameLength: number;
    platformId: string;
    gameMode: string;
    bannedChampions: BannedChampion[];
    gameQueueConfigId: number;
    observers: { encryptionKey: string };
    participants: CurrentGameParticipant[];
}

export interface BannedChampion {
    pickTurn: number;
    championId: number;
    teamId: number;
}

export interface CurrentGameParticipant {
    championId: number;
    perks: {
        perkIds: number[];
        perkStyle: number;
        perkSubStyle: number;
    };
    profileIconId: number;
    bot: boolean;
    teamId: number;
    summonerId: string;
    puuid: string;
    spell1Id: number;
    spell2Id: number;
    riotId: string;
}
