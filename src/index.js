import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import http from "http";
import { runOnboarding } from "./skills/onboarding.js";
import { runCampaignManager } from "./skills/campaignManager.js";
import { runContentDirector } from "./skills/contentDirector.js";
import { runBrandStrategist } from "./skills/brandStrategist.js";
import { runGrowthAnalyst } from "./skills/growthAnalyst.js";
import { runCanvaBuilder } from "./skills/canvaBuilder.js";

// ─── Server Setup ─────────────────────────────────────────────────────────────
// Villa tools return prompts. Claude executes them using the client's own
// subscription. No Anthropic API key required on this server.

function createServer() {
  const server = new McpServer({
    name: "villa-marketing-agency",
    version: "2.0.0",
    description:
      "VILLA — Full-service marketing agency inside Claude. Five specialist tools. Zero briefing.",
  });

  // ─── Onboarding ────────────────────────────────────────────────────────────

  server.tool(
    "villa_onboarding",
    "Run Villa client onboarding. Builds a Brand Hub from the client's business information. " +
      "All other Villa tools read from this Brand Hub. Run this first. " +
      "Trigger when client says: 'set up my account', 'onboard me', 'get started', or 'I am new here'.",
    {
      existing_context: z
        .string()
        .optional()
        .describe(
          "Any brand context already found in the client's Claude history or Project instructions. " +
            "Pass everything found so Villa can pre-fill the intake."
        ),
      client_input: z
        .string()
        .optional()
        .describe("What the client has said about their business in this conversation."),
    },
    async ({ existing_context, client_input }) => {
      const result = runOnboarding({ existing_context, client_input });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Campaign Manager ──────────────────────────────────────────────────────

  server.tool(
    "villa_campaign_manager",
    "Build email campaigns, SMS sequences, nurture sequences, and promotional campaigns. " +
      "Trigger when client asks for: email copy, SMS messages, a campaign, a sequence, or re-engagement content.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project instructions. " +
            "Copy the entire VILLA BRAND HUB block here."
        ),
      request: z
        .string()
        .describe(
          "What the client wants. Include: what they are promoting, the offer, " +
            "the audience segment, timeline, and desired CTA."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = runCampaignManager({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Content Director ──────────────────────────────────────────────────────

  server.tool(
    "villa_content_director",
    "Build content calendars, Reels scripts, talking head scripts, AI video prompts, and carousel outlines. " +
      "Trigger when client asks for: a content calendar, social media content, video concepts, or carousel copy. " +
      "For finished Canva designs, follow up with villa_canva_builder.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project instructions. " +
            "Copy the entire VILLA BRAND HUB block here."
        ),
      request: z
        .string()
        .describe(
          "What the client wants. Include: platform, goal, topic or product to feature, " +
            "and how many weeks or pieces of content they need."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = runContentDirector({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Brand Strategist ──────────────────────────────────────────────────────

  server.tool(
    "villa_brand_strategist",
    "Build brand positioning, tone of voice guides, luxury brand direction, and brand audits. " +
      "Trigger when client asks about: positioning, differentiation, brand voice, visual direction, or brand consistency.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project instructions. " +
            "Copy the entire VILLA BRAND HUB block here."
        ),
      request: z
        .string()
        .describe(
          "What the client wants. Include: what they want to define, refine, or audit, " +
            "and any context about their current brand situation."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = runBrandStrategist({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Growth Analyst ────────────────────────────────────────────────────────

  server.tool(
    "villa_growth_analyst",
    "Analyze campaign performance, social media results, email metrics, and business growth. " +
      "Trigger when client shares data and wants to know: what is working, what to improve, or where to focus next.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project instructions. " +
            "Copy the entire VILLA BRAND HUB block here."
        ),
      request: z
        .string()
        .describe(
          "What the client wants analyzed. Include: all data they shared, metrics, " +
            "date range, campaign name, platform, and what they want to understand."
        ),
    },
    async ({ brand_hub, request }) => {
      const result = runGrowthAnalyst({ brand_hub, request });
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ─── Canva Builder ─────────────────────────────────────────────────────────

  server.tool(
    "villa_canva_builder",
    "Write carousel copy zone by zone and build finished designs in the client's Canva account. " +
      "Villa writes all copy respecting Canva container word limits, then executes the design " +
      "using the Canva MCP tools connected to the client's account. " +
      "Trigger when client asks to: build a carousel, create an Instagram post design, or design any Canva content. " +
      "Requires a Canva Template Design ID in the Brand Hub.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project instructions. " +
            "Must include Canva Template Design ID for design execution."
        ),
      request: z
        .string()
        .describe(
          "What the client wants designed. Include: topic, angle, platform, " +
            "and any specific points to cover in the carousel."
        ),
      template_design_id: z
        .string()
        .optional()
        .describe(
          "The client's Canva template design ID. Villa extracts this from the Brand Hub automatically. " +
            "Only pass manually if overriding the Brand Hub value. Format: DAG0khl78Do"
        ),
      content_brief: z
        .string()
        .optional()
        .describe(
          "Existing content to adapt into a carousel. Pass a blog post, newsletter, " +
            "or villa_content_director output here to convert it into a Canva design."
        ),
    },
    async ({ brand_hub, request, template_design_id, content_brief }) => {
      const result = runCanvaBuilder({ brand_hub, request, template_design_id, content_brief });
      return { content: [{ type: "text", text: result }] };
    }
  );

  return server;
}

// ─── Transport ────────────────────────────────────────────────────────────────

const USE_HTTP = process.env.PORT !== undefined;

if (USE_HTTP) {
  const server = createServer();
  const port = parseInt(process.env.PORT || "3000");
  const transports = new Map();

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "villa-mcp", version: "2.0.0" }));
      return;
    }

    if (req.method === "GET" && (req.url === "/mcp" || req.url === "/mcp/")) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const transport = new SSEServerTransport("/mcp/message", res);
      transports.set(transport.sessionId, transport);
      transport.onclose = () => transports.delete(transport.sessionId);

      await server.connect(transport);
      await transport.start();
      return;
    }

    if (req.method === "POST" && (req.url === "/mcp/message" || req.url?.startsWith("/mcp/message?"))) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const sessionId = url.searchParams.get("sessionId");
      const transport = transports.get(sessionId);

      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }

      await transport.handlePostMessage(req, res);
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  httpServer.listen(port, () => {
    console.log(`VILLA MCP server running on port ${port}`);
    console.log(`MCP endpoint:  http://localhost:${port}/mcp`);
    console.log(`Health check:  http://localhost:${port}/health`);
  });
} else {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("VILLA MCP server running in stdio mode");
}
