import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import http from "http";
import { runOnboarding } from "./skills/onboarding.js";
import { runCampaignManager } from "./skills/campaignManager.js";
import { runContentDirector } from "./skills/contentDirector.js";
import { runBrandStrategist } from "./skills/brandStrategist.js";
import { runGrowthAnalyst } from "./skills/growthAnalyst.js";

// ─── Server Setup ────────────────────────────────────────────────────────────

function createServer() {
  const server = new McpServer({
    name: "villa-marketing-agency",
    version: "1.0.0",
    description:
      "VILLA Autonomous Marketing Agency — full-service marketing execution inside Claude.",
  });

  // ─── Tool: Onboarding ──────────────────────────────────────────────────────

  server.tool(
    "villa_onboarding",
    "Run Villa client onboarding. Collects brand information and builds a Brand Hub " +
      "that all other Villa tools read from. Run this first before any marketing work. " +
      "Also use when client says 'set up my account', 'onboard me', or 'I am new here'.",
    {
      existing_context: z
        .string()
        .optional()
        .describe(
          "Any brand context already found in the client's Claude history or Project. " +
            "Pass everything you have found so Villa can pre-fill the intake."
        ),
      client_input: z
        .string()
        .optional()
        .describe(
          "What the client has already said about their business in this conversation."
        ),
    },
    async ({ existing_context, client_input }) => {
      const result = await runOnboarding({ existing_context, client_input });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Tool: Campaign Manager ────────────────────────────────────────────────

  server.tool(
    "villa_campaign_manager",
    "Build email campaigns, SMS sequences, nurture sequences, and promotional campaigns. " +
      "Use when client asks for email copy, SMS messages, a campaign, a sequence, or re-engagement.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project context. " +
            "Copy the entire VILLA BRAND HUB block here before calling this tool."
        ),
      request: z
        .string()
        .describe(
          "What the client wants. Include any details they provided: " +
            "what they are promoting, the offer, the audience segment, timeline, and CTA."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = await runCampaignManager({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Tool: Content Director ────────────────────────────────────────────────

  server.tool(
    "villa_content_director",
    "Build content calendars, Reels scripts, talking head video scripts, and AI video prompts. " +
      "Use when client asks for social media content, a content calendar, video concepts, or posting ideas.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project context. " +
            "Copy the entire VILLA BRAND HUB block here before calling this tool."
        ),
      request: z
        .string()
        .describe(
          "What the client wants. Include platform, goal, topic or product to feature, " +
            "and how many weeks or pieces of content they need."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = await runContentDirector({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Tool: Brand Strategist ────────────────────────────────────────────────

  server.tool(
    "villa_brand_strategist",
    "Build brand positioning, tone of voice guides, luxury brand direction, and brand audits. " +
      "Use when client asks about positioning, differentiation, brand voice, visual direction, or brand consistency.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project context. " +
            "Copy the entire VILLA BRAND HUB block here before calling this tool."
        ),
      request: z
        .string()
        .describe(
          "What the client wants. Include what specifically they want to define, " +
            "refine, or audit and any context about their current brand situation."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = await runBrandStrategist({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Tool: Growth Analyst ──────────────────────────────────────────────────

  server.tool(
    "villa_growth_analyst",
    "Analyze campaign performance, social media results, email metrics, and business growth. " +
      "Use when client shares data and wants to know what is working, what to improve, or where to focus next.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project context. " +
            "Copy the entire VILLA BRAND HUB block here before calling this tool."
        ),
      request: z
        .string()
        .describe(
          "What the client wants analyzed. Include all data they have shared: " +
            "metrics, date range, campaign name, platform, and what they want to understand."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = await runGrowthAnalyst({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  return server;
}

// ─── CORS Helper ─────────────────────────────────────────────────────────────

function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = createServer();
const port = parseInt(process.env.PORT || "8080");

const httpServer = http.createServer(async (req, res) => {
  setCORSHeaders(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "villa-mcp", version: "1.0.0" }));
    return;
  }

  // MCP endpoint
  if (req.url === "/mcp" || req.url === "/mcp/") {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`VILLA MCP server running on port ${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`Health check: http://localhost:${port}/health`);
});
