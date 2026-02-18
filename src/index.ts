import { Actor, log } from 'apify';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';
import { initRiotClient, getAccountByRiotId, setApiKeyRefreshCallback } from './services/riot-client.js';
import { initDataDragon, getDataDragonStatus } from './services/data-dragon.js';
import { initCache, getCacheStats } from './services/cache.js';
import { getRateLimitStatus } from './services/rate-limiter.js';
import { allTools, toolCounts } from './tools/index.js';
import type { Region, ActorInput } from './types/index.js';

/**
 * Create and configure the Express app with all MCP endpoints
 */
function createApp(defaultRegion: string, cacheEnabled: boolean) {
    const app = express();
    app.use(express.json());
    app.use(cors({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
    }));

    // Apify Standby readiness probe + root info
    app.get('/', (req: Request, res: Response) => {
        res.status(200).json({
            name: 'lol-mcp-server',
            status: 'running',
            mcp: '/mcp',
            health: '/health',
            docs: '/docs',
        });
    });

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        const dataDragonStatus = getDataDragonStatus();
        const cacheStats = getCacheStats();
        const rateLimitStatus = getRateLimitStatus();

        res.json({
            status: 'healthy',
            server: 'lol-mcp-server',
            version: '2.0.0',
            defaultRegion,
            cacheEnabled,
            dataDragon: dataDragonStatus,
            cache: cacheStats,
            rateLimit: rateLimitStatus,
            tools: toolCounts,
        });
    });

    // Streamable HTTP endpoint — stateless, one server+transport per request
    app.post('/mcp', async (req: Request, res: Response) => {
        log.info('Received POST /mcp request');

        const server = createMcpServer();
        try {
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            res.on('close', () => {
                log.info('Request closed');
                transport.close();
                server.close();
            });
        } catch (error: any) {
            log.error(`Error handling /mcp request: ${error.message}`);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'Internal server error' },
                    id: null,
                });
            }
        }
    });

    app.get('/mcp', (_req: Request, res: Response) => {
        res.writeHead(405).end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed.' },
            id: null,
        }));
    });

    app.delete('/mcp', (_req: Request, res: Response) => {
        res.writeHead(405).end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed.' },
            id: null,
        }));
    });

    // List tools endpoint
    app.get('/tools', async (req: Request, res: Response) => {
        res.json({
            version: '2.0.0',
            counts: toolCounts,
            tools: allTools.map(t => ({
                name: t.name,
                description: t.description,
            })),
        });
    });

    // Documentation endpoint
    app.get('/docs', (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'text/markdown');
        res.send(`# LoL Stats MCP - League of Legends AI Connector

## Overview
Advanced MCP Server for League of Legends analytics with Data Dragon integration, intelligent caching, and AI-powered recommendations.

## Features
- **Data Dragon Integration**: Champion names, item names, rune names automatically resolved
- **Intelligent Caching**: Reduces API calls, faster responses
- **Rate Limiting**: Smart request management with retry logic
- **Tier-Based Benchmarks**: Recommendations adjusted to your rank
- **Multi-language**: English and French support

## Tools (${toolCounts.total} total)

### Account Tools (${toolCounts.account})
- \`lol_get_account\` - Get account by Riot ID
- \`lol_get_summoner\` - Get summoner info
- \`lol_get_ranked\` - Get ranked stats
- \`lol_get_player_profile\` - Get complete profile

### Match Tools (${toolCounts.match})
- \`lol_get_match_history\` - Get match IDs
- \`lol_get_match_details\` - Get match details with resolved names
- \`lol_get_match_timeline\` - Get minute-by-minute timeline

### Mastery Tools (${toolCounts.mastery})
- \`lol_get_champion_mastery\` - Get mastery with champion info

### Live Game Tools (${toolCounts.liveGame})
- \`lol_get_live_game\` - Check if player is in game

### Analysis Tools (${toolCounts.analysis})
- \`lol_analyze_performance\` - Analyze recent performance
- \`lol_analyze_champion\` - Analyze champion-specific stats
- \`lol_get_improvement_tips\` - Get personalized tips
- \`lol_compare_players\` - Compare two players
`);
    });

    return app;
}

const CONFIG_STORE_NAME = 'lol-mcp-config';
const CONFIG_KEY = 'SAVED_INPUT';

/**
 * Save the Actor input to a named key-value store that persists across runs.
 * Called during normal runs so Standby runs can retrieve the config later.
 */
async function saveInputConfig(input: ActorInput): Promise<void> {
    try {
        const store = await Actor.openKeyValueStore(CONFIG_STORE_NAME);
        await store.setValue(CONFIG_KEY, input);
        log.info('Saved input config to named KV store for Standby use');
    } catch (error: any) {
        log.warning(`Failed to save input config: ${error.message}`);
    }
}

/**
 * Load saved input config from the named key-value store.
 * In Standby mode, Actor.getInput() returns empty, so we read from persistent storage.
 */
async function loadSavedInputConfig(): Promise<ActorInput | null> {
    try {
        const store = await Actor.openKeyValueStore(CONFIG_STORE_NAME);
        const saved = await store.getValue<ActorInput>(CONFIG_KEY);
        if (saved?.riotApiKey) {
            log.info('Found saved Riot API key in named KV store');
            return saved;
        }
        log.info('Named KV store exists but no riotApiKey found');
    } catch (error: any) {
        log.warning(`Failed to load saved input config: ${error.message}`);
    }
    return null;
}

Actor.main(async () => {
    const isStandbyRun = process.env.APIFY_META_ORIGIN === 'STANDBY';

    // Get input: try Actor.getInput(), then named KV store fallback
    let input = await Actor.getInput<ActorInput>();
    let riotApiKey = input?.riotApiKey || process.env.RIOT_API_KEY || '';

    // In Standby mode, Actor.getInput() is unreliable (returns stale/empty data).
    // Always prefer the saved config from the last normal run.
    if (isStandbyRun || !riotApiKey) {
        log.info('Loading saved config from KV store...');
        const savedInput = await loadSavedInputConfig();
        if (savedInput?.riotApiKey) {
            riotApiKey = savedInput.riotApiKey;
            input = { ...input, ...savedInput };
            log.info('Loaded API key from saved config');
        }
    }

    // Save config ONLY during normal runs (Standby would overwrite with stale data)
    if (riotApiKey && input && !isStandbyRun) {
        await saveInputConfig(input);
    }

    const defaultRegion = input?.defaultRegion || 'euw1';
    const cacheEnabled = input?.cacheEnabled !== false;

    log.info('Initializing LoL Stats MCP...');

    initCache(cacheEnabled);

    if (!riotApiKey) {
        log.warning('No Riot API key provided. Set it in Actor input or as RIOT_API_KEY environment variable.');
        log.warning('The MCP server will start but API calls will fail until a key is provided.');
    }

    initRiotClient(riotApiKey, defaultRegion);
    log.info(`Riot API client initialized with default region: ${defaultRegion}`);

    // Register callback to auto-refresh API key on 401 errors
    setApiKeyRefreshCallback(async () => {
        log.info('Attempting to reload API key from saved config...');
        const saved = await loadSavedInputConfig();
        return saved?.riotApiKey || null;
    });

    // Only load Data Dragon for Standby/Local modes (skip for normal validation runs)
    if (isStandbyRun || !Actor.isAtHome()) {
        await initDataDragon();
    }

    if (isStandbyRun) {
        // --- STANDBY RUN: Start HTTP server and keep alive ---
        const app = createApp(defaultRegion, cacheEnabled);
        const port = process.env.APIFY_CONTAINER_PORT
            ? parseInt(process.env.APIFY_CONTAINER_PORT, 10)
            : 8080;

        app.listen(port, () => {
            log.info(`LoL MCP Server running in Standby mode on port ${port}`);
            log.info(`   Tools: ${toolCounts.total} | Cache: ${cacheEnabled ? 'on' : 'off'} | Region: ${defaultRegion}`);
        });

        await new Promise(() => {});

    } else if (Actor.isAtHome()) {
        // --- NORMAL RUN: Validate configuration and exit ---
        log.info(`Running in normal mode (origin: ${process.env.APIFY_META_ORIGIN}) - validating configuration...`);

        let riotApiKeyValid = false;
        let validationMessage = '';

        try {
            const testAccount = await getAccountByRiotId('Faker', 'KR1', 'kr');
            riotApiKeyValid = true;
            validationMessage = `Riot API key is valid. Test lookup: ${testAccount.gameName}#${testAccount.tagLine}`;
            log.info(validationMessage);
        } catch (error: any) {
            validationMessage = `Riot API key validation failed: ${error.message}`;
            log.warning(validationMessage);
            log.warning('The MCP server will still work in Standby mode once a valid API key is provided.');
        }

        await Actor.pushData({
            status: riotApiKeyValid ? 'success' : 'warning',
            message: riotApiKeyValid
                ? 'LoL MCP Server configuration is valid. Use Standby mode to connect AI assistants.'
                : `${validationMessage}. Development API keys expire every 24h - regenerate at https://developer.riotgames.com`,
            riotApiKeyValid,
            defaultRegion,
            cacheEnabled,
            toolsAvailable: toolCounts.total,
            tools: allTools.map((t: any) => t.name),
            timestamp: new Date().toISOString(),
        });

        log.info(`Validation complete. ${toolCounts.total} tools. API key valid: ${riotApiKeyValid}.`);

    } else {
        // --- LOCAL DEVELOPMENT ---
        const app = createApp(defaultRegion, cacheEnabled);
        const port = 3000;

        app.listen(port, () => {
            log.info(`LoL MCP Server running locally on port ${port}`);
            log.info(`   Tools: ${toolCounts.total} | Cache: ${cacheEnabled ? 'on' : 'off'} | Region: ${defaultRegion}`);
        });

        await new Promise(() => {});
    }
});
