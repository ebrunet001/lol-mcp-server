// ============================================================================
// Data Dragon Types
// ============================================================================

export interface DataDragonVersion {
    version: string;
    cdn: string;
}

// Champion Data
export interface ChampionData {
    id: string;
    key: string; // Numeric ID as string
    name: string;
    title: string;
    blurb: string;
    tags: string[]; // e.g., ["Mage", "Support"]
    partype: string; // Resource type (Mana, Energy, etc.)
    info: {
        attack: number;
        defense: number;
        magic: number;
        difficulty: number;
    };
    image: {
        full: string;
        sprite: string;
        group: string;
    };
    stats: ChampionStats;
}

export interface ChampionStats {
    hp: number;
    hpperlevel: number;
    mp: number;
    mpperlevel: number;
    movespeed: number;
    armor: number;
    armorperlevel: number;
    spellblock: number;
    spellblockperlevel: number;
    attackrange: number;
    hpregen: number;
    hpregenperlevel: number;
    mpregen: number;
    mpregenperlevel: number;
    crit: number;
    critperlevel: number;
    attackdamage: number;
    attackdamageperlevel: number;
    attackspeedperlevel: number;
    attackspeed: number;
}

export interface ChampionMap {
    [key: string]: ChampionData;
}

// Item Data
export interface ItemData {
    name: string;
    description: string;
    plaintext: string;
    gold: {
        base: number;
        total: number;
        sell: number;
        purchasable: boolean;
    };
    tags: string[];
    stats: Record<string, number>;
    image: {
        full: string;
        sprite: string;
        group: string;
    };
    into?: string[];
    from?: string[];
    maps: Record<string, boolean>;
}

export interface ItemMap {
    [key: string]: ItemData;
}

// Summoner Spell Data
export interface SummonerSpellData {
    id: string;
    name: string;
    description: string;
    key: string;
    cooldownBurn: string;
    image: {
        full: string;
        sprite: string;
        group: string;
    };
}

export interface SummonerSpellMap {
    [key: string]: SummonerSpellData;
}

// Rune Data
export interface RuneTree {
    id: number;
    key: string;
    name: string;
    icon: string;
    slots: RuneSlot[];
}

export interface RuneSlot {
    runes: RuneData[];
}

export interface RuneData {
    id: number;
    key: string;
    name: string;
    shortDesc: string;
    longDesc: string;
    icon: string;
}

// Profile Icon
export interface ProfileIconData {
    id: number;
    image: {
        full: string;
        sprite: string;
        group: string;
    };
}

// Resolved Data (with names instead of IDs)
export interface ResolvedChampion {
    id: number;
    name: string;
    title: string;
    roles: string[];
    difficulty: number;
    imageUrl: string;
}

export interface ResolvedItem {
    id: number;
    name: string;
    description: string;
    cost: number;
    imageUrl: string;
}

export interface ResolvedSummonerSpell {
    id: number;
    name: string;
    description: string;
    cooldown: string;
    imageUrl: string;
}

export interface ResolvedRune {
    id: number;
    name: string;
    description: string;
    tree: string;
    imageUrl: string;
}
