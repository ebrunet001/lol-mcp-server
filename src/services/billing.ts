import { Actor, log } from 'apify';
import type { BillingEvent } from '../types/index.js';

// Tool to billing event mapping
const TOOL_EVENTS: Record<string, BillingEvent> = {
    // Read tools — simple data retrieval ($0.005)
    'lol_get_account': 'tool-read',
    'lol_get_summoner': 'tool-read',
    'lol_get_ranked': 'tool-read',
    'lol_get_champion_mastery': 'tool-read',

    // Action tools — match data, live game, player profile ($0.01)
    'lol_get_player_profile': 'tool-action',
    'lol_get_match_history': 'tool-action',
    'lol_get_match_details': 'tool-action',
    'lol_get_match_timeline': 'tool-action',
    'lol_get_live_game': 'tool-action',

    // AI tools — analysis and comparison ($0.025)
    'lol_analyze_performance': 'tool-ai',
    'lol_analyze_champion': 'tool-ai',
    'lol_analyze_laning': 'tool-ai',
    'lol_get_improvement_tips': 'tool-ai',
    'lol_compare_players': 'tool-ai',
};

/**
 * Get the billing event type for a tool
 */
export function getToolBillingEvent(toolName: string): BillingEvent {
    return TOOL_EVENTS[toolName] || 'tool-read';
}

/**
 * Charge for a tool usage
 */
export async function chargeForTool(toolName: string): Promise<void> {
    const eventName = getToolBillingEvent(toolName);

    try {
        await Actor.charge({ eventName });
        log.debug(`Charged for ${toolName} (${eventName})`);
    } catch (error: any) {
        // Don't fail the tool if charging fails (e.g., during development/testing)
        log.warning(`Failed to charge for ${toolName}: ${error.message}`);
    }
}

/**
 * Pricing info for display
 */
export const PRICING: Record<BillingEvent, { priceUsd: number; description: string }> = {
    'tool-read': { priceUsd: 0.005, description: 'Read Operation' },
    'tool-action': { priceUsd: 0.01, description: 'Action' },
    'tool-ai': { priceUsd: 0.025, description: 'AI Analysis' },
};

/**
 * Get pricing information for a tool
 */
export function getToolPricing(toolName: string): { priceUsd: number; description: string } {
    const event = getToolBillingEvent(toolName);
    return PRICING[event];
}
