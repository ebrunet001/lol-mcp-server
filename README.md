# League of Legends MCP Server

Connect AI assistants to League of Legends data via Model Context Protocol. Let AI analyze your performance, identify weaknesses & suggest optimal strategies. Access player profiles, match history, ranked stats & champion mastery.

## Features

- **Player Profiles** - Search players by Riot ID (gameName#tagLine) across all regions
- **Ranked Stats** - Get tier, rank, LP, win/loss ratio and league standings
- **Match History** - Retrieve recent matches with detailed statistics
- **Champion Mastery** - View mastery levels, points and top champions
- **Performance Analysis** - Let AI analyze your gameplay and suggest improvements
- **Live Game** - Check if a player is currently in a match
- **Player Comparison** - Compare stats between two players
- **Data Dragon Integration** - Champion, item, rune and spell names automatically resolved
- **Intelligent Caching** - Reduces API calls with smart TTL-based caching
- **Multi-Region Support** - EUW, NA, KR, BR, and all other LoL servers

## Quick Start

### 1. Get your Riot API Key

1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Log in with your **Riot Games account** (same as your LoL account)
3. Copy your **Development API Key** from the dashboard

> Development keys expire every **24 hours**. For permanent access, apply for a Personal key.

### 2. Configure the Actor

1. Go to the [LoL MCP Server](https://apify.com/scrapmania/lol-mcp-server) on Apify
2. Enter your **Riot API Key** in the Input tab
3. Click **Save**

### 3. Connect to Claude Desktop

1. Open **Claude Desktop** → **Settings** → **Connectors**
2. Click **Add Custom Connector**
3. Paste this URL:

```
https://scrapmania--lol-mcp-server.apify.actor/mcp?token=YOUR_APIFY_TOKEN
```

Replace `YOUR_APIFY_TOKEN` with your [Apify API token](https://console.apify.com/account/integrations).

### 4. Grant permanent permissions (recommended)

By default, Claude Desktop asks for approval every time an MCP tool is called. To allow all LoL tools permanently:

In **Claude Code**, run `/permissions` and add `mcp__LoL__*` to the **Allow** list.

In **Claude Desktop**, click **"Always allow"** when prompted for the first tool call.

> The prefix `mcp__LoL__` matches the MCP server name. If you used a different name (e.g., `lol`), adjust the pattern accordingly (`mcp__lol__*`).

That's it! Claude can now access your League of Legends data.

## Available Tools

Once connected, your AI assistant can use these tools:

| Tool | Description |
|------|-------------|
| `lol_get_account` | Get account info by Riot ID (gameName#tagLine) |
| `lol_get_summoner` | Get summoner info (level, profile icon) |
| `lol_get_ranked` | Get ranked stats (tier, rank, LP, wins/losses) |
| `lol_get_match_history` | Get list of recent match IDs |
| `lol_get_match_details` | Get detailed info about a specific match |
| `lol_get_match_timeline` | Get minute-by-minute match timeline |
| `lol_get_champion_mastery` | Get champion mastery data |
| `lol_get_player_profile` | Get complete player profile in one call |
| `lol_get_live_game` | Check if a player is currently in game |
| `lol_analyze_performance` | Analyze recent performance with recommendations |
| `lol_analyze_champion` | Analyze performance on a specific champion |
| `lol_get_improvement_tips` | Get personalized improvement tips |
| `lol_compare_players` | Compare stats between two players |

## What can AI do with your LoL data?

### Post-game coaching
> "I just lost 3 games in a row. Analyze what went wrong — am I repeating the same mistakes?"

### Champion pool optimization
> "Based on my last 50 games, which 3 champions should I focus on to climb fastest?"

### Duo synergy analysis
> "Compare me and my duo partner. What are our strengths together? What should we work on?"

### Role swap readiness
> "I'm a support main thinking of switching to mid. Analyze my stats — am I ready?"

### Improvement tracking
> "Compare my stats from this week vs last week. Am I getting better or stuck?"

### Live scouting
> "I'm in game right now. Look up my opponents and tell me what to watch out for."

## Supported Regions

| Region Code | Server |
|-------------|--------|
| `euw1` | Europe West |
| `eun1` | Europe Nordic & East |
| `na1` | North America |
| `kr` | Korea |
| `br1` | Brazil |
| `la1` | Latin America North |
| `la2` | Latin America South |
| `oc1` | Oceania |
| `tr1` | Turkey |
| `ru` | Russia |
| `jp1` | Japan |
| `ph2` | Philippines |
| `sg2` | Singapore |
| `th2` | Thailand |
| `tw2` | Taiwan |
| `vn2` | Vietnam |

## API Key Types

### Development Key (Default)
- Automatically generated when you sign in
- Expires every 24 hours
- Good for testing and personal use
- Rate limit: 20 requests / second, 100 requests / 2 minutes

### Personal Key
- Does not expire
- For personal projects or small communities
- Register your product at [developer.riotgames.com](https://developer.riotgames.com/)

### Production Key
- Higher rate limits
- For public applications
- Requires product approval from Riot

## Input Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `riotApiKey` | string | Yes | Your Riot Games API key |
| `defaultRegion` | string | No | Default region (default: `euw1`) |
| `defaultLanguage` | string | No | Language for analysis (default: `en`) |
| `cacheEnabled` | boolean | No | Enable intelligent caching (default: `true`) |

## Output

The MCP server exposes League of Legends data through the Model Context Protocol, allowing any MCP-compatible AI assistant to:

- Query player information in real-time
- Analyze match statistics
- Provide personalized coaching advice
- Track progress over time

## Privacy & Security

- Your Riot API key is only used to authenticate requests to Riot's API
- No player data is stored permanently
- All requests are made directly to Riot Games' official API
- This Actor complies with [Riot Games API Terms of Service](https://developer.riotgames.com/terms)

## Troubleshooting

### "API Key Invalid" Error
- Check that your API key hasn't expired (development keys last 24h)
- Regenerate your key at [developer.riotgames.com](https://developer.riotgames.com/)

### "Player Not Found" Error
- Verify the Riot ID format: `gameName#tagLine` (e.g., `Faker#KR1`)
- Check you're using the correct region
- The player may have changed their name recently

### Claude Desktop Not Connecting
- Ensure you're using the full URL with `/mcp` path: `https://scrapmania--lol-mcp-server.apify.actor/mcp?token=YOUR_TOKEN`
- Verify your Apify token is valid at [console.apify.com](https://console.apify.com/account/integrations)
- Restart Claude Desktop after configuration changes
- The server may need a few seconds to start on first connection (cold start)

## How much does it cost?

This MCP server uses Apify's pay-per-event pricing. You only pay for the tools you actually use:

| Operation | Price | Examples |
|-----------|-------|----------|
| **Read** | $0.005 | get_account, get_summoner, get_ranked, get_champion_mastery |
| **Action** | $0.01 | get_match_history, get_match_details, get_live_game |
| **AI** | $0.025 | analyze_performance, analyze_champion, compare_players |

**Free tier**: Apify gives you $5 free credits every month — enough for hundreds of tool calls.

**Example costs**:
- Quick player lookup (2 reads): ~$0.01
- Match history review (1 read + 3 actions): ~$0.035
- Full performance analysis with AI (2 reads + 2 actions + 2 AI): ~$0.08
- Detailed coaching session (5 reads + 5 actions + 3 AI): ~$0.15

## FAQ

### Do I need a Riot Games account?
Yes. You need a Riot Games account to generate an API key at [developer.riotgames.com](https://developer.riotgames.com/). This is the same account you use to play League of Legends.

### Does the development API key expire?
Yes, development keys expire every 24 hours. You need to regenerate your key daily. For permanent access, apply for a Personal API key through the Riot Developer Portal.

### Does this work with ChatGPT?
Yes. Any MCP-compatible AI client can connect to this server. It works with Claude Desktop, ChatGPT, and other AI agents that support the Model Context Protocol.

### Is my data stored?
No. The server processes requests in real-time and does not store any player data permanently. All data is fetched directly from Riot Games' official API.

### Which regions are supported?
All League of Legends regions are supported: EUW, EUNE, NA, KR, BR, LAN, LAS, OCE, TR, RU, JP, PH, SG, TH, TW, VN.

### Can I analyze other players?
Yes. You can look up any player's public data by providing their Riot ID (gameName#tagLine). No special permissions are needed for public data.

## Related Actors

- [TFT MCP Server](https://apify.com/scrapmania/teamfight-tactics-mcp-server---ai-game-analysis) - MCP server for Teamfight Tactics player analytics
- [Todoist AI Assistant](https://apify.com/scrapmania/todoist-ai-assistant) - MCP server for AI-powered Todoist task management

## Resources

- [GitHub Repository](https://github.com/ebrunet001/lol-mcp-server)
- [Riot Developer Portal](https://developer.riotgames.com/)
- [Riot API Documentation](https://developer.riotgames.com/apis)
- [Claude Desktop MCP Setup](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [Apify MCP Documentation](https://docs.apify.com/platform/integrations/mcp)

## License

This Actor is provided as-is for educational and personal use. Usage must comply with [Riot Games API Terms and Conditions](https://developer.riotgames.com/terms).

---

**Built for the League of Legends community**
