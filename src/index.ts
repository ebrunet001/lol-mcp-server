import { Actor, log } from 'apify';
import express, { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './server.js';
import { initRiotClient, getAccountByRiotId } from './services/riot-client.js';
import { initDataDragon, getDataDragonStatus } from './services/data-dragon.js';
import { initCache, getCacheStats } from './services/cache.js';
import { getRateLimitStatus } from './services/rate-limiter.js';
import { allTools, toolCounts } from './tools/index.js';
import type { Region, ActorInput } from './types/index.js';

// Store active transports
const transports: Map<string, SSEServerTransport> = new Map();

/**
 * Create and configure the Express app with all MCP endpoints
 */
function createApp(defaultRegion: string, cacheEnabled: boolean) {
    const app = express();

    // Body parsing middleware (skip for MCP messages)
    app.use((req, res, next) => {
        if (req.path === '/messages') {
            next();
        } else {
            express.json()(req, res, next);
        }
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

    // SSE endpoint for MCP connections
    app.get('/sse', async (req: Request, res: Response) => {
        log.info('New SSE connection request');

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const transport = new SSEServerTransport('/messages', res);
        const sessionId = transport.sessionId;
        transports.set(sessionId, transport);

        const server = createMcpServer();

        req.on('close', () => {
            log.info(`Client disconnected: ${sessionId}`);
            transports.delete(sessionId);
        });

        await server.connect(transport);
        log.info(`MCP server connected for session: ${sessionId}`);
    });

    // Messages endpoint for client-to-server communication
    app.post('/messages', async (req: Request, res: Response) => {
        const sessionId = req.query.sessionId as string;

        if (!sessionId) {
            res.status(400).json({ error: 'Session ID required' });
            return;
        }

        const transport = transports.get(sessionId);
        if (!transport) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        try {
            await transport.handlePostMessage(req, res);
        } catch (error: any) {
            log.error(`Error handling message: ${error.message}`);
            res.status(500).json({ error: error.message });
        }
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

Actor.main(async () => {
    // Get input
    const input = await Actor.getInput<ActorInput>();

    if (!input?.riotApiKey) {
        throw new Error('Riot API key is required. Please provide it in the input. Get one at https://developer.riotgames.com/');
    }

    // Initialize services
    const defaultRegion = input.defaultRegion || 'euw1';
    const cacheEnabled = input.cacheEnabled !== false;

    log.info('Initializing LoL Stats MCP...');

    initCache(cacheEnabled);
    initRiotClient(input.riotApiKey, defaultRegion);
    log.info(`Riot API client initialized with default region: ${defaultRegion}`);

    await initDataDragon();

    // Detect how the run was started
    const metaOrigin = process.env.APIFY_META_ORIGIN;
    const isStandbyRun = metaOrigin === 'STANDBY';

    if (isStandbyRun) {
        // --- STANDBY RUN: Start HTTP server and keep alive ---
        const app = createApp(defaultRegion, cacheEnabled);
        const port = process.env.ACTOR_STANDBY_PORT
            ? parseInt(process.env.ACTOR_STANDBY_PORT, 10)
            : 8080;

        app.listen(port, () => {
            log.info(`LoL MCP Server running in Standby mode on port ${port}`);
            log.info(`   Tools: ${toolCounts.total} | Cache: ${cacheEnabled ? 'on' : 'off'} | Region: ${defaultRegion}`);
        });

        await new Promise(() => {});

    } else if (Actor.isAtHome()) {
        // --- NORMAL RUN: Validate configuration and exit ---
        log.info(`Running in normal mode (origin: ${metaOrigin}) - validating configuration...`);

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

        const dataDragonStatus = getDataDragonStatus();

        await Actor.pushData({
            status: riotApiKeyValid ? 'success' : 'warning',
            message: riotApiKeyValid
                ? 'LoL MCP Server configuration is valid. Use Standby mode to connect AI assistants.'
                : `${validationMessage}. Development API keys expire every 24h - regenerate at https://developer.riotgames.com`,
            riotApiKeyValid,
            defaultRegion,
            cacheEnabled,
            dataDragon: dataDragonStatus,
            toolsAvailable: toolCounts.total,
            tools: allTools.map((t: any) => t.name),
            timestamp: new Date().toISOString(),
        });

        log.info(`Validation complete. ${toolCounts.total} tools, Data Dragon v${dataDragonStatus.version}. API key valid: ${riotApiKeyValid}.`);

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
