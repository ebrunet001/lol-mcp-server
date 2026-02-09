// Import all tool groups
import { accountTools } from './account.js';
import { matchTools } from './match.js';
import { masteryTools } from './mastery.js';
import { liveGameTools } from './live-game.js';
import { analysisTools } from './analysis/index.js';

// Export all tools combined
export const allTools = [
    ...accountTools,
    ...matchTools,
    ...masteryTools,
    ...liveGameTools,
    ...analysisTools,
];

// Export tool names for reference
export const toolNames = allTools.map(tool => tool.name);

// Export individual tool groups
export { accountTools } from './account.js';
export { matchTools } from './match.js';
export { masteryTools } from './mastery.js';
export { liveGameTools } from './live-game.js';
export { analysisTools } from './analysis/index.js';

// Tool count by category
export const toolCounts = {
    account: accountTools.length,
    match: matchTools.length,
    mastery: masteryTools.length,
    liveGame: liveGameTools.length,
    analysis: analysisTools.length,
    total: allTools.length,
};
