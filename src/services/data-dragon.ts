import { log } from 'apify';
import { API_URLS } from '../constants/index.js';
import { cacheGet, cacheSet } from './cache.js';
import type {
    ChampionData,
    ChampionMap,
    ItemData,
    ItemMap,
    SummonerSpellData,
    SummonerSpellMap,
    RuneTree,
    ResolvedChampion,
    ResolvedItem,
    ResolvedSummonerSpell,
    ResolvedRune,
} from '../types/index.js';

let currentVersion: string | null = null;

// ID-to-data maps (loaded from Data Dragon)
let championsById: Map<number, ChampionData> = new Map();
let championsByName: Map<string, ChampionData> = new Map();
let itemsById: Map<number, ItemData> = new Map();
let spellsById: Map<number, SummonerSpellData> = new Map();
let runesById: Map<number, { rune: any; tree: string }> = new Map();

/**
 * Fetch JSON from Data Dragon
 */
async function fetchDataDragon<T>(path: string): Promise<T> {
    const url = `${API_URLS.DATA_DRAGON}${path}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Data Dragon error: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

/**
 * Get latest Data Dragon version
 */
export async function getLatestVersion(): Promise<string> {
    if (currentVersion) {
        return currentVersion;
    }

    // Check cache
    const cached = cacheGet<string>('dataDragon', 'version');
    if (cached) {
        currentVersion = cached;
        return cached;
    }

    // Fetch from API
    const versions = await fetchDataDragon<string[]>('/api/versions.json');
    currentVersion = versions[0];

    cacheSet('dataDragon', 'version', currentVersion);
    log.info(`Data Dragon version: ${currentVersion}`);

    return currentVersion;
}

/**
 * Load all champion data
 */
async function loadChampions(): Promise<void> {
    const version = await getLatestVersion();
    const cacheKey = `champions-${version}`;

    // Check cache
    const cached = cacheGet<ChampionMap>('dataDragon', cacheKey);
    if (cached) {
        indexChampions(cached);
        return;
    }

    // Fetch from API
    const data = await fetchDataDragon<{ data: ChampionMap }>(
        `/cdn/${version}/data/en_US/champion.json`
    );

    cacheSet('dataDragon', cacheKey, data.data);
    indexChampions(data.data);

    log.info(`Loaded ${championsById.size} champions`);
}

/**
 * Index champions by ID and name
 */
function indexChampions(champions: ChampionMap): void {
    championsById.clear();
    championsByName.clear();

    for (const [name, champion] of Object.entries(champions)) {
        const id = parseInt(champion.key, 10);
        championsById.set(id, champion);
        championsByName.set(name.toLowerCase(), champion);
        championsByName.set(champion.name.toLowerCase(), champion);
    }
}

/**
 * Load all item data
 */
async function loadItems(): Promise<void> {
    const version = await getLatestVersion();
    const cacheKey = `items-${version}`;

    // Check cache
    const cached = cacheGet<ItemMap>('dataDragon', cacheKey);
    if (cached) {
        indexItems(cached);
        return;
    }

    // Fetch from API
    const data = await fetchDataDragon<{ data: ItemMap }>(
        `/cdn/${version}/data/en_US/item.json`
    );

    cacheSet('dataDragon', cacheKey, data.data);
    indexItems(data.data);

    log.info(`Loaded ${itemsById.size} items`);
}

/**
 * Index items by ID
 */
function indexItems(items: ItemMap): void {
    itemsById.clear();

    for (const [id, item] of Object.entries(items)) {
        itemsById.set(parseInt(id, 10), item);
    }
}

/**
 * Load all summoner spell data
 */
async function loadSummonerSpells(): Promise<void> {
    const version = await getLatestVersion();
    const cacheKey = `summoner-${version}`;

    // Check cache
    const cached = cacheGet<SummonerSpellMap>('dataDragon', cacheKey);
    if (cached) {
        indexSpells(cached);
        return;
    }

    // Fetch from API
    const data = await fetchDataDragon<{ data: SummonerSpellMap }>(
        `/cdn/${version}/data/en_US/summoner.json`
    );

    cacheSet('dataDragon', cacheKey, data.data);
    indexSpells(data.data);

    log.info(`Loaded ${spellsById.size} summoner spells`);
}

/**
 * Index spells by ID
 */
function indexSpells(spells: SummonerSpellMap): void {
    spellsById.clear();

    for (const spell of Object.values(spells)) {
        spellsById.set(parseInt(spell.key, 10), spell);
    }
}

/**
 * Load all rune data
 */
async function loadRunes(): Promise<void> {
    const version = await getLatestVersion();
    const cacheKey = `runes-${version}`;

    // Check cache
    const cached = cacheGet<RuneTree[]>('dataDragon', cacheKey);
    if (cached) {
        indexRunes(cached);
        return;
    }

    // Fetch from API
    const data = await fetchDataDragon<RuneTree[]>(
        `/cdn/${version}/data/en_US/runesReforged.json`
    );

    cacheSet('dataDragon', cacheKey, data);
    indexRunes(data);

    log.info(`Loaded ${runesById.size} runes`);
}

/**
 * Index runes by ID
 */
function indexRunes(trees: RuneTree[]): void {
    runesById.clear();

    for (const tree of trees) {
        // Index tree itself
        runesById.set(tree.id, { rune: tree, tree: tree.name });

        // Index all runes in tree
        for (const slot of tree.slots) {
            for (const rune of slot.runes) {
                runesById.set(rune.id, { rune, tree: tree.name });
            }
        }
    }
}

/**
 * Initialize Data Dragon (load all data)
 */
export async function initDataDragon(): Promise<void> {
    log.info('Initializing Data Dragon...');

    await Promise.all([
        loadChampions(),
        loadItems(),
        loadSummonerSpells(),
        loadRunes(),
    ]);

    log.info('Data Dragon initialized');
}

/**
 * Get champion by ID
 */
export function getChampionById(id: number): ResolvedChampion | null {
    const champion = championsById.get(id);
    if (!champion) return null;

    return {
        id,
        name: champion.name,
        title: champion.title,
        roles: champion.tags,
        difficulty: champion.info.difficulty,
        imageUrl: `${API_URLS.DATA_DRAGON_CDN}/${currentVersion}/img/champion/${champion.image.full}`,
    };
}

/**
 * Get champion by name
 */
export function getChampionByName(name: string): ResolvedChampion | null {
    const champion = championsByName.get(name.toLowerCase());
    if (!champion) return null;

    return {
        id: parseInt(champion.key, 10),
        name: champion.name,
        title: champion.title,
        roles: champion.tags,
        difficulty: champion.info.difficulty,
        imageUrl: `${API_URLS.DATA_DRAGON_CDN}/${currentVersion}/img/champion/${champion.image.full}`,
    };
}

/**
 * Get item by ID
 */
export function getItemById(id: number): ResolvedItem | null {
    if (id === 0) return null; // Empty slot

    const item = itemsById.get(id);
    if (!item) return null;

    return {
        id,
        name: item.name,
        description: item.plaintext || item.description,
        cost: item.gold.total,
        imageUrl: `${API_URLS.DATA_DRAGON_CDN}/${currentVersion}/img/item/${id}.png`,
    };
}

/**
 * Get summoner spell by ID
 */
export function getSummonerSpellById(id: number): ResolvedSummonerSpell | null {
    const spell = spellsById.get(id);
    if (!spell) return null;

    return {
        id,
        name: spell.name,
        description: spell.description,
        cooldown: spell.cooldownBurn,
        imageUrl: `${API_URLS.DATA_DRAGON_CDN}/${currentVersion}/img/spell/${spell.image.full}`,
    };
}

/**
 * Get rune by ID
 */
export function getRuneById(id: number): ResolvedRune | null {
    const data = runesById.get(id);
    if (!data) return null;

    const { rune, tree } = data;

    return {
        id,
        name: rune.name || rune.key,
        description: rune.shortDesc || rune.longDesc || '',
        tree,
        imageUrl: `${API_URLS.DATA_DRAGON_CDN}/img/${rune.icon}`,
    };
}

/**
 * Resolve all items for a participant
 */
export function resolveItems(itemIds: number[]): (ResolvedItem | null)[] {
    return itemIds.map(id => getItemById(id));
}

/**
 * Get profile icon URL
 */
export function getProfileIconUrl(iconId: number): string {
    return `${API_URLS.DATA_DRAGON_CDN}/${currentVersion}/img/profileicon/${iconId}.png`;
}

/**
 * Get Data Dragon status
 */
export function getDataDragonStatus(): {
    version: string | null;
    championsLoaded: number;
    itemsLoaded: number;
    spellsLoaded: number;
    runesLoaded: number;
} {
    return {
        version: currentVersion,
        championsLoaded: championsById.size,
        itemsLoaded: itemsById.size,
        spellsLoaded: spellsById.size,
        runesLoaded: runesById.size,
    };
}
