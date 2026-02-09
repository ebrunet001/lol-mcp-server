import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from 'apify';
import { allTools, toolCounts } from './tools/index.js';

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: 'lol-mcp-server',
        version: '2.0.0',
    });

    log.info(`Registering ${allTools.length} tools...`);
    log.info(`  - Account tools: ${toolCounts.account}`);
    log.info(`  - Match tools: ${toolCounts.match}`);
    log.info(`  - Mastery tools: ${toolCounts.mastery}`);
    log.info(`  - Live game tools: ${toolCounts.liveGame}`);
    log.info(`  - Analysis tools: ${toolCounts.analysis}`);

    // Register all tools
    for (const tool of allTools) {
        server.tool(
            tool.name,
            tool.description,
            tool.schema.shape,
            async (args: any) => {
                try {
                    log.info(`Executing tool: ${tool.name}`);
                    const startTime = Date.now();

                    const result = await tool.handler(args);

                    const duration = Date.now() - startTime;
                    log.info(`Tool ${tool.name} completed in ${duration}ms`);

                    return result;
                } catch (error: any) {
                    log.error(`Error in tool ${tool.name}: ${error.message}`);

                    return {
                        content: [{
                            type: 'text' as const,
                            text: JSON.stringify({
                                error: error.message,
                                tool: tool.name,
                                hint: getErrorHint(error.message),
                            }, null, 2),
                        }],
                        isError: true,
                    };
                }
            }
        );
        log.debug(`Registered tool: ${tool.name}`);
    }

    log.info(`MCP server created with ${allTools.length} tools`);

    return server;
}

/**
 * Get helpful hint for common errors
 */
function getErrorHint(errorMessage: string): string {
    if (errorMessage.includes('Invalid Riot API key')) {
        return 'Check that your Riot API key is valid and not expired. Development keys expire every 24 hours.';
    }
    if (errorMessage.includes('Rate limit')) {
        return 'Rate limit reached. The request will be retried automatically. If this persists, wait a few seconds.';
    }
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return 'The player or resource was not found. Check the spelling of the Riot ID or PUUID.';
    }
    if (errorMessage.includes('403')) {
        return 'Access denied. Your API key may not have access to this endpoint. Check your API key permissions.';
    }
    return 'If this error persists, check the Riot API status at https://developer.riotgames.com/';
}
