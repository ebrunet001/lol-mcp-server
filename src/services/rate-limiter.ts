import { log } from 'apify';
import { RATE_LIMITS } from '../constants/index.js';

interface RateLimitState {
    requestsThisSecond: number;
    requestsThis2Minutes: number;
    lastSecondReset: number;
    last2MinutesReset: number;
    queue: Array<{
        resolve: () => void;
        priority: number;
    }>;
    processing: boolean;
}

const state: RateLimitState = {
    requestsThisSecond: 0,
    requestsThis2Minutes: 0,
    lastSecondReset: Date.now(),
    last2MinutesReset: Date.now(),
    queue: [],
    processing: false,
};

/**
 * Reset counters if time windows have passed
 */
function resetCountersIfNeeded(): void {
    const now = Date.now();

    // Reset per-second counter
    if (now - state.lastSecondReset >= 1000) {
        state.requestsThisSecond = 0;
        state.lastSecondReset = now;
    }

    // Reset per-2-minutes counter
    if (now - state.last2MinutesReset >= 120000) {
        state.requestsThis2Minutes = 0;
        state.last2MinutesReset = now;
    }
}

/**
 * Check if we can make a request
 */
function canMakeRequest(): boolean {
    resetCountersIfNeeded();

    return (
        state.requestsThisSecond < RATE_LIMITS.REQUESTS_PER_SECOND &&
        state.requestsThis2Minutes < RATE_LIMITS.REQUESTS_PER_2_MINUTES
    );
}

/**
 * Record a request
 */
function recordRequest(): void {
    state.requestsThisSecond++;
    state.requestsThis2Minutes++;
}

/**
 * Calculate wait time until we can make a request
 */
function getWaitTime(): number {
    resetCountersIfNeeded();

    // If per-second limit is hit, wait until next second
    if (state.requestsThisSecond >= RATE_LIMITS.REQUESTS_PER_SECOND) {
        return 1000 - (Date.now() - state.lastSecondReset);
    }

    // If per-2-minutes limit is hit, wait until reset
    if (state.requestsThis2Minutes >= RATE_LIMITS.REQUESTS_PER_2_MINUTES) {
        return 120000 - (Date.now() - state.last2MinutesReset);
    }

    return 0;
}

/**
 * Process the request queue
 */
async function processQueue(): Promise<void> {
    if (state.processing || state.queue.length === 0) {
        return;
    }

    state.processing = true;

    while (state.queue.length > 0) {
        const waitTime = getWaitTime();

        if (waitTime > 0) {
            log.debug(`Rate limit: waiting ${waitTime}ms`);
            await sleep(waitTime);
        }

        if (canMakeRequest()) {
            // Sort by priority (higher = more important)
            state.queue.sort((a, b) => b.priority - a.priority);

            const next = state.queue.shift();
            if (next) {
                recordRequest();
                next.resolve();
            }
        }
    }

    state.processing = false;
}

/**
 * Wait for rate limit slot
 * @param priority - Higher priority requests are processed first (default: 0)
 */
export async function waitForRateLimit(priority: number = 0): Promise<void> {
    // If we can make a request immediately, do so
    if (canMakeRequest()) {
        recordRequest();
        return;
    }

    // Otherwise, queue the request
    return new Promise<void>((resolve) => {
        state.queue.push({ resolve, priority });
        processQueue();
    });
}

/**
 * Execute a function with rate limiting
 */
export async function withRateLimit<T>(
    fn: () => Promise<T>,
    priority: number = 0
): Promise<T> {
    await waitForRateLimit(priority);
    return fn();
}

/**
 * Execute a function with retry on rate limit
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = RATE_LIMITS.MAX_RETRIES,
    priority: number = 0
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            await waitForRateLimit(priority);
            return await fn();
        } catch (error: any) {
            lastError = error;

            // If rate limited (429), wait and retry
            if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
                const delay = RATE_LIMITS.RETRY_DELAY_MS * Math.pow(2, attempt);
                log.warning(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                await sleep(delay);
                continue;
            }

            // For other errors, throw immediately
            throw error;
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): {
    requestsThisSecond: number;
    requestsThis2Minutes: number;
    queueLength: number;
    canMakeRequest: boolean;
} {
    resetCountersIfNeeded();

    return {
        requestsThisSecond: state.requestsThisSecond,
        requestsThis2Minutes: state.requestsThis2Minutes,
        queueLength: state.queue.length,
        canMakeRequest: canMakeRequest(),
    };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
