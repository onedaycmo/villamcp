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

// ─── Server Setup ────────────────────────────────────────────────────────────

function createServer() {
  const server = new McpServer({
    name: "villa-marketing-agency",
    version: "1.1.0",
    description:
      "VILLA Autonomous Marketing Agency — full-service marketing execution inside Claude.",
  });

  // ─── Tool: Onboarding ──────────────────────────────────────────────────────

  server.tool(
    "villa_onboarding",
    "Run Villa client onboarding. Collects brand information and builds a Brand Hub " +
      "that all other Villa tools read from. Also collects the client's Canva template " +
      "design ID so Villa can build finished designs in their account. " +
      "Run this first before any marketing work. " +
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
    "Build content calendars, Reels scripts, talking head video scripts, AI video prompts, " +
      "and carousel content outlines. Use when client asks for social media content, a content " +
      "calendar, video concepts, carousel copy, or posting ideas. " +
      "For finished Canva designs, follow up with villa_canva_builder.",
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

  // ─── Tool: Canva Builder ───────────────────────────────────────────────────

  server.tool(
    "villa_canva_builder",
    "Produce a structured carousel design brief mapped zone-by-zone to the client's Canva template. " +
      "Villa generates the copy, validates word counts against Canva container limits, and outputs " +
      "a build-ready brief. Claude then executes the design in the client's Canva account using " +
      "the Canva MCP merge-designs, start-editing-transaction, perform-editing-operations, and " +
      "commit-editing-transaction tools. " +
      "Use when client asks to build an Instagram carousel, social post design, or any Canva content. " +
      "Requires a Canva Template Design ID in the Brand Hub.",
    {
      brand_hub: z
        .string()
        .describe(
          "The client's full Brand Hub from their Claude Project context. " +
            "Must include Canva Template Design ID for design execution to work."
        ),
      request: z
        .string()
        .describe(
          "What the client wants designed. Include the topic, angle, platform, " +
            "and any specific points they want covered in the carousel."
        ),
      template_design_id: z
        .string()
        .optional()
        .describe(
          "The client's Canva template design ID. Extract from their Brand Hub " +
            "Canva Template Design ID field. Looks like: DAG0khl78Do"
        ),
      content_brief: z
        .string()
        .optional()
        .describe(
          "Optional: existing content or copy to adapt into the carousel. " +
            "Pass a blog post, newsletter, or villa_content_director output here " +
            "to convert it into a Canva-ready design brief."
        ),
    },
    async ({ brand_hub, request, template_design_id, content_brief }) => {
      // Extract template ID from brand hub if not passed directly
      let resolvedTemplateId = template_design_id;
      if (!resolvedTemplateId) {
        const match = brand_hub.match(/Canva Template Design ID:\s*([A-Za-z0-9_-]+)/);
        if (match) resolvedTemplateId = match[1];
      }

      const result = await runCanvaBuilder({
        brand_hub,
        request,
        template_design_id: resolvedTemplateId,
        content_brief,
      });
      return { content: [{ type: "text", text: result }] };
    }
  );

  return server;
}

// ─── Transport: SSE (for Railway/Render) or Stdio (for local testing) ────────

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
      res.end(JSON.stringify({ status: "ok", server: "villa-mcp", version: "1.1.0" }));
      return;
    }

    if (req.method === "GET" && (req.url === "/mcp" || req.url === "/mcp/")) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const transport = new SSEServerTransport("/mcp/message", res);
      transports.set(transport.sessionId, transport);

      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };

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
    console.log(`SSE endpoint:  http://localhost:${port}/mcp`);
    console.log(`Post endpoint: http://localhost:${port}/mcp/message`);
    console.log(`Health check:  http://localhost:${port}/health`);
  });
} else {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("VILLA MCP server running in stdio mode");
}
