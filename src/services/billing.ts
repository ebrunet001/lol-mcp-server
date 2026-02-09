import { Actor, log } from 'apify';
import type { BillingEvent } from '../types/index.js';

// Tool to billing event mapping
const TOOL_EVENTS: Record<string, BillingEvent> = {
    // Read tools (simple data retrieval)
    'lol_get_account': 'tool-read',
    'lol_get_summoner': 'tool-read',
    'lol_get_ranked': 'tool-read',
    'lol_get_champion_mastery': 'tool-read',

    // Match tools
    'lol_get_match_history': 'tool-match',
    'lol_get_match_details': 'tool-match',
    'lol_get_match_timeline': 'tool-match',
    'lol_get_player_profile': 'tool-match', // Multiple API calls

    // Analysis tools
    'lol_analyze_performance': 'tool-analysis',
    'lol_analyze_champion': 'tool-analysis',
    'lol_analyze_laning': 'tool-analysis',
    'lol_get_improvement_tips': 'tool-analysis',

    // Live game tools
    'lol_get_live_game': 'tool-live',

    // Comparison tools
    'lol_compare_players': 'tool-compare',
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
    'tool-read': { priceUsd: 0.003, description: 'Data Read' },
    'tool-match': { priceUsd: 0.005, description: 'Match Data' },
    'tool-analysis': { priceUsd: 0.015, description: 'AI Analysis' },
    'tool-live': { priceUsd: 0.008, description: 'Live Game' },
    'tool-compare': { priceUsd: 0.025, description: 'Player Comparison' },
};

/**
 * Get pricing information for a tool
 */
export function getToolPricing(toolName: string): { priceUsd: number; description: string } {
    const event = getToolBillingEvent(toolName);
    return PRICING[event];
}
