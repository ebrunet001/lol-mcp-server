// Queue Types
export const QUEUE_TYPES: Record<number, string> = {
    0: 'Custom',
    400: 'Normal Draft',
    420: 'Ranked Solo/Duo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM',
    700: 'Clash',
    720: 'ARAM Clash',
    830: 'Co-op vs AI Intro',
    840: 'Co-op vs AI Beginner',
    850: 'Co-op vs AI Intermediate',
    900: 'URF',
    1020: 'One for All',
    1300: 'Nexus Blitz',
    1400: 'Ultimate Spellbook',
    1700: 'Arena',
    1710: 'Arena', // 2v2v2v2
    1900: 'Pick URF',
};

// Queue IDs for filtering
export const RANKED_QUEUES = [420, 440]; // Solo/Duo and Flex
export const NORMAL_QUEUES = [400, 430]; // Draft and Blind
export const ARAM_QUEUES = [450, 720];

// Positions
export const POSITIONS: Record<string, string> = {
    TOP: 'Top',
    JUNGLE: 'Jungle',
    MIDDLE: 'Mid',
    BOTTOM: 'ADC',
    UTILITY: 'Support',
    '': 'Unknown',
};

// Position mapping from various formats
export const POSITION_ALIASES: Record<string, string> = {
    TOP: 'TOP',
    JUNGLE: 'JUNGLE',
    MIDDLE: 'MIDDLE',
    MID: 'MIDDLE',
    BOTTOM: 'BOTTOM',
    BOT: 'BOTTOM',
    ADC: 'BOTTOM',
    UTILITY: 'UTILITY',
    SUPPORT: 'UTILITY',
    SUP: 'UTILITY',
};
