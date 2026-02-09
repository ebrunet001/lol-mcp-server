import type { Region, RegionalRoute } from '../types/index.js';

// Region to Regional Route mapping (for account and match APIs)
export const REGION_TO_ROUTE: Record<Region, RegionalRoute> = {
    // Europe
    euw1: 'europe',
    eun1: 'europe',
    tr1: 'europe',
    ru: 'europe',
    // Americas
    na1: 'americas',
    br1: 'americas',
    la1: 'americas',
    la2: 'americas',
    // Asia
    kr: 'asia',
    jp1: 'asia',
    // SEA
    oc1: 'sea',
    ph2: 'sea',
    sg2: 'sea',
    th2: 'sea',
    tw2: 'sea',
    vn2: 'sea',
};

// Region display names
export const REGION_NAMES: Record<Region, string> = {
    euw1: 'Europe West',
    eun1: 'Europe Nordic & East',
    na1: 'North America',
    kr: 'Korea',
    br1: 'Brazil',
    la1: 'Latin America North',
    la2: 'Latin America South',
    oc1: 'Oceania',
    tr1: 'Turkey',
    ru: 'Russia',
    jp1: 'Japan',
    ph2: 'Philippines',
    sg2: 'Singapore',
    th2: 'Thailand',
    tw2: 'Taiwan',
    vn2: 'Vietnam',
};

// All supported regions
export const ALL_REGIONS: Region[] = [
    'euw1', 'eun1', 'na1', 'kr', 'br1', 'la1', 'la2',
    'oc1', 'tr1', 'ru', 'jp1', 'ph2', 'sg2', 'th2', 'tw2', 'vn2',
];
