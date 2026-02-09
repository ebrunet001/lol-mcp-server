# League of Legends MCP Server

Connect AI assistants to League of Legends data via Model Context Protocol. Let AI analyze your performance, identify weaknesses & suggest optimal strategies. Access player profiles, match history, ranked stats & champion mastery.

## 🎮 Features

- **Player Profiles** - Search players by Riot ID (gameName#tagLine) across all regions
- **Ranked Stats** - Get tier, rank, LP, win/loss ratio and league standings
- **Match History** - Retrieve recent matches with detailed statistics
- **Champion Mastery** - View mastery levels, points and top champions
- **Performance Analysis** - Let AI analyze your gameplay and suggest improvements
- **Multi-Region Support** - EUW, NA, KR, BR, and all other LoL servers

## 🚀 Quick Start

### 1. Get your Riot API Key

1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Log in with your **Riot Games account** (same as your LoL account)
3. Once logged in, a **Development API Key** is automatically generated
4. Copy your API key from the dashboard

> ⚠️ **Important**: Development keys expire every **24 hours**. You'll need to regenerate them daily. For permanent access, register a Personal or Production application.

### 2. Run the Actor on Apify

1. Go to the [League of Legends MCP Server](https://apify.com/scrapmania/lol-mcp-server) Actor page
2. Click **Start**
3. Enter your Riot API Key in the input
4. The Actor will start and provide you with an MCP endpoint URL

### 3. Connect to Claude Desktop

Add the following configuration to your Claude Desktop config file:

**On macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lol-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://scrapmania--lol-mcp-server.apify.actor/mcp?token=YOUR_APIFY_TOKEN"
      ]
    }
  }
}
```

Replace `YOUR_APIFY_TOKEN` with your Apify API token (found in [Apify Console → Settings → Integrations](https://console.apify.com/account/integrations)).

**Restart Claude Desktop** after saving the configuration.

## 🔧 Available Tools

Once connected, your AI assistant can use these tools:

| Tool | Description |
|------|-------------|
| `lol_get_account` | Get account info by Riot ID (gameName#tagLine) |
| `lol_get_summoner` | Get summoner info (level, profile icon) |
| `lol_get_ranked` | Get ranked stats (tier, rank, LP, wins/losses) |
| `lol_get_match_history` | Get list of recent match IDs |
| `lol_get_match_details` | Get detailed info about a specific match |
| `lol_get_champion_mastery` | Get champion mastery data |
| `lol_get_player_profile` | Get complete player profile in one call |
| `lol_analyze_performance` | Analyze recent performance with recommendations |
| `lol_analyze_champion` | Analyze performance on a specific champion |
| `lol_get_improvement_tips` | Get personalized improvement tips |

## 💬 Example Prompts

Once connected to Claude, try these prompts:

```
Show me the profile of player "Faker#KR1" on the Korean server
```

```
Analyze my last 20 ranked games and tell me what I need to improve. 
My Riot ID is "YourName#EUW"
```

```
What are my best champions based on mastery and recent performance?
```

```
Compare my stats on Jinx vs my stats on Caitlyn over my last 30 games
```

```
Give me tips to climb from Gold to Platinum based on my gameplay patterns
```

## 🌍 Supported Regions

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

## 🔑 API Key Types

### Development Key (Default)
- ✅ Automatically generated when you sign in
- ⚠️ Expires every 24 hours
- ✅ Good for testing and personal use
- Rate limit: 20 requests / second, 100 requests / 2 minutes

### Personal Key
- ✅ Does not expire
- ✅ For personal projects or small communities
- Register your product at [developer.riotgames.com](https://developer.riotgames.com/)

### Production Key
- ✅ Higher rate limits
- ✅ For public applications
- Requires product approval from Riot

## ⚙️ Input Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `riotApiKey` | string | Yes | Your Riot Games API key |
| `defaultRegion` | string | No | Default region (default: `euw1`) |

## 📊 Output

The MCP server exposes League of Legends data through the Model Context Protocol, allowing any MCP-compatible AI assistant to:

- Query player information in real-time
- Analyze match statistics
- Provide personalized coaching advice
- Track progress over time

## 🔒 Privacy & Security

- Your Riot API key is only used to authenticate requests to Riot's API
- No player data is stored permanently
- All requests are made directly to Riot Games' official API
- This Actor complies with [Riot Games API Terms of Service](https://developer.riotgames.com/terms)

## 🐛 Troubleshooting

### "API Key Invalid" Error
- Check that your API key hasn't expired (development keys last 24h)
- Regenerate your key at [developer.riotgames.com](https://developer.riotgames.com/)

### "Player Not Found" Error
- Verify the Riot ID format: `gameName#tagLine` (e.g., `Faker#KR1`)
- Check you're using the correct region
- The player may have changed their name recently

### Claude Desktop Not Connecting
- Ensure Node.js 18+ is installed
- Verify the config file path is correct
- Restart Claude Desktop after configuration changes
- Check your Apify token is valid

## 📚 Resources

- [Riot Developer Portal](https://developer.riotgames.com/)
- [Riot API Documentation](https://developer.riotgames.com/apis)
- [Claude Desktop MCP Setup](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [Apify MCP Documentation](https://docs.apify.com/platform/integrations/mcp)

## 📝 License

This Actor is provided as-is for educational and personal use. Usage must comply with [Riot Games API Terms and Conditions](https://developer.riotgames.com/terms).

---

**Built with ❤️ for the League of Legends community**
