# VILLA MCP Server

Full-service luxury marketing agency running inside Claude.
Five tools. Zero briefing. Marketing on demand.

## Tools

- `villa_onboarding` — client intake, builds Brand Hub from scratch or past Claude context
- `villa_campaign_manager` — email sequences, SMS campaigns, promotional campaigns
- `villa_content_director` — content calendars, Reels scripts, talking head scripts, AI video prompts
- `villa_brand_strategist` — positioning, tone of voice, luxury brand direction, brand audits
- `villa_growth_analyst` — campaign analysis, social media reports, growth strategy

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to railway.app and create a new project
3. Select "Deploy from GitHub repo" and connect this repo
4. In the Variables tab, add: `ANTHROPIC_API_KEY=your_key_here`
5. Railway assigns a public URL automatically — it looks like: `https://villa-mcp-production.up.railway.app`
6. Your MCP endpoint is: `https://villa-mcp-production.up.railway.app/mcp`

---

## Deploy to Render

1. Push this repo to GitHub
2. Go to render.com and create a new Web Service
3. Connect the repo, set runtime to Node, start command to `node src/index.js`
4. Add environment variable: `ANTHROPIC_API_KEY=your_key_here`
5. Your MCP endpoint is: `https://your-service-name.onrender.com/mcp`

---

## Client Installation Instructions

Give clients this one-paragraph setup guide:

> To connect Villa to your Claude account, go to claude.ai, open Settings,
> click Connectors, then Add Connector. Select "Remote MCP Server" and paste
> this URL: `https://your-villa-url.up.railway.app/mcp`. Click Connect and
> authorize. Villa will appear in your Claude tools. Say "set up my account"
> to begin your brand intake.

---

## Local Testing with Claude Desktop

Add this to your Claude Desktop config file
(Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "villa": {
      "command": "node",
      "args": ["/path/to/villa-mcp/src/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. Villa tools will appear in the tools panel.

---

## How the Brand Hub Works

Villa does not store any client data. Each client's Brand Hub lives in their
own Claude Project instructions. When a client calls a Villa tool, Claude
automatically passes the Brand Hub from their Project context to the tool.

The client saves their Brand Hub once after onboarding and never has to
explain their business again.

---

## Project Structure

```
villa-mcp/
├── src/
│   ├── index.js              # Server entry point, tool definitions
│   └── skills/
│       ├── claude.js         # Shared Anthropic API caller
│       ├── onboarding.js     # Brand Hub intake
│       ├── campaignManager.js
│       ├── contentDirector.js
│       ├── brandStrategist.js
│       └── growthAnalyst.js
├── package.json
├── railway.toml
└── .env.example
```
