import { callClaude } from "./claude.js";

// ─── Template Registry ────────────────────────────────────────────────────────
// Maps template types to their page numbers and zone specs.
// When a client provides their own template, Villa reads it at runtime
// via the Canva MCP get-design-pages and get-design-content tools.
// These defaults document the expected structure a client template should follow.

const TEMPLATE_TYPES = {
  carousel_short: {
    slides: 4,
    description: "Short punchy topic, one through-line",
    zones_per_slide: ["context_dark", "body_light", "statement_dark", "outro_cta"],
  },
  carousel_data: {
    slides: 5,
    description: "Data-led or trend topic",
    zones_per_slide: ["context_dark_bullets", "body_light_callout", "body_light_full", "statement_dark", "speaking_cta"],
  },
  carousel_comparison: {
    slides: 6,
    description: "Comparison or stop/start framework",
    zones_per_slide: ["context_dark_bullets", "body_two_column", "body_dark_story", "body_light_data", "comparison_stop_start", "substack_cta"],
  },
  carousel_story: {
    slides: 5,
    description: "Story-driven, narrative arc",
    zones_per_slide: ["story_opening", "story_spiral", "story_realization", "statement_stress_test", "outro_operator"],
  },
  carousel_experiment: {
    slides: 4,
    description: "Hook-heavy, experiment or case study",
    zones_per_slide: ["hook_photo", "context_constraints", "body_proof", "statement_definition"],
  },
};

// ─── Zone Copy Rules ──────────────────────────────────────────────────────────
// Word count limits enforced during copy generation.
// These match the Canva template container dimensions at 1080x1350px.

const ZONE_RULES = {
  hook_main: { min: 6, max: 12, style: "Sentence case. Bold claim that stops the scroll." },
  hook_subtext: { min: 5, max: 10, style: "Sentence case. Parenthetical follow-up." },
  setup_body: { min: 18, max: 30, style: "2-3 complete sentences. State the problem or observation." },
  callout: { min: 8, max: 15, style: "Bold. The single diagnostic or reframe line." },
  bullet_item: { min: 4, max: 10, style: "One complete phrase per line. No fragments." },
  body_paragraph: { min: 25, max: 50, style: "2-3 sentences. Deeper explanation or proof." },
  statement_header: { min: 8, max: 15, style: "The contrarian claim or uncomfortable truth." },
  story_zone: { min: 30, max: 70, style: "Narrative. Real example. Visceral and specific." },
  cta_line_1: { min: 10, max: 15, style: "Bridge from content to offer." },
  cta_line_2: { min: 8, max: 12, style: "Direct action. Tap link, subscribe, follow." },
  kicker: { min: 5, max: 10, style: "Punchy closing. One memorable sentence." },
};

// ─── Main Function ────────────────────────────────────────────────────────────

export async function runCanvaBuilder({ brand_hub, request, template_design_id, content_brief }) {
  const hasTemplate = template_design_id && template_design_id.trim().length > 0;
  const hasBrief = content_brief && content_brief.trim().length > 0;

  const systemPrompt = `You are VILLA's Design Director — a luxury marketing agency specialist.
You produce structured carousel copy briefs that are executed in the client's Canva account.

BRAND CONTEXT:
${brand_hub}

YOUR JOB:
Produce a complete, structured design brief in JSON format.
The brief maps every slide to its zones and every zone to its copy.
Word counts are hard limits based on Canva container dimensions at 1080x1350px.
Every word count must be respected. Never exceed the maximum.

VOICE AND STANDARDS:
- Write in the client's exact brand voice as defined in the Brand Hub above
- Active voice, complete sentences, no em dashes, no fragments
- Never use: "amazing", "game-changing", "unlock", "dive deep", "leverage", "skyrocket"
- Never use words listed under "Never Sounds Like" in the Brand Hub
- Hook slides must stop the scroll in under 3 seconds
- CTAs must be specific and direct — no "learn more" or "check it out"
- Luxury and premium voice applies regardless of price tier

ZONE WORD COUNT LIMITS (hard limits — never exceed):
- Hook main: 6-12 words
- Hook subtext: 5-10 words
- Setup body: 18-30 words
- Callout / statement: 8-15 words
- Bullet item: 4-10 words per bullet
- Body paragraph: 25-50 words
- Story zone: 30-70 words
- CTA line 1: 10-15 words
- CTA line 2: 8-12 words
- Kicker: 5-10 words

OUTPUT FORMAT:
Respond with valid JSON only. No preamble, no explanation, no markdown fences.

{
  "design_brief": {
    "title": "[Topic] — [Brand Name] Carousel",
    "template_design_id": "${template_design_id || 'CLIENT_TEMPLATE_ID'}",
    "template_type": "[carousel_short | carousel_data | carousel_comparison | carousel_story | carousel_experiment]",
    "slides": [
      {
        "slide_number": 1,
        "slide_type": "cover",
        "template_page_label": "COVER — [Type A/B/C based on hook structure]",
        "zones": [
          {
            "zone_id": "main_hook",
            "zone_label": "Main Hook",
            "word_limit_min": 6,
            "word_limit_max": 12,
            "copy": "[Hook copy here]",
            "word_count": 0
          }
        ]
      }
    ],
    "canva_instructions": {
      "step_1": "In Claude, use the Canva merge-designs tool with type create_new_design to duplicate the pages listed in page_selections from design ID listed in template_design_id.",
      "step_2": "Use start-editing-transaction on the new design ID to get current element IDs.",
      "step_3": "Map each zone's copy to the corresponding element ID from the transaction response.",
      "step_4": "Use perform-editing-operations to push all copy in one call using replace_text operations.",
      "step_5": "Use commit-editing-transaction to finalize. Font (Varela Round or client font) must be applied manually — font family is not supported via the Canva API.",
      "font_note": "Apply the brand font manually after committing. The API replaces text content only."
    },
    "approval_checklist": [
      "Every hook stops the scroll within 3 seconds",
      "Every zone respects its word count limit",
      "No em dashes anywhere",
      "No sentence fragments in callouts or kickers",
      "CTA is specific and action-oriented",
      "Voice matches Brand Hub tone words throughout",
      "Old way vs. new way framing where relevant"
    ]
  }
}

Fill word_count for each zone with the actual word count of the copy you wrote.
If any zone exceeds its limit, rewrite it before outputting. Never output a brief
with a zone over its word count maximum.`;

  const userMessage = hasBrief
    ? `Build a Canva carousel brief for this content:\n\n${content_brief}\n\nAdditional context: ${request}`
    : `Build a Canva carousel brief for this request: ${request}`;

  const rawJson = await callClaude(systemPrompt, userMessage, 6000);

  // Parse and validate the JSON before returning
  let brief;
  try {
    const cleaned = rawJson.replace(/```json|```/g, "").trim();
    brief = JSON.parse(cleaned);
  } catch {
    // If JSON parse fails, return the raw output with an error flag
    return JSON.stringify({
      error: "Brief generation returned invalid JSON. Raw output below.",
      raw: rawJson,
    }, null, 2);
  }

  // Validate word counts and flag overages
  const overages = [];
  const slides = brief?.design_brief?.slides || [];

  slides.forEach((slide) => {
    (slide.zones || []).forEach((zone) => {
      if (zone.word_count > zone.word_limit_max) {
        overages.push(
          `Slide ${slide.slide_number} / ${zone.zone_label}: ${zone.word_count} words (limit: ${zone.word_limit_max})`
        );
      }
    });
  });

  if (overages.length > 0) {
    brief.design_brief.word_count_warnings = overages;
  }

  const output = [
    "VILLA CANVA DESIGN BRIEF",
    "========================",
    "",
    JSON.stringify(brief, null, 2),
    "",
    "========================",
    "HOW TO BUILD THIS IN CANVA",
    "========================",
    "",
    "This brief is ready for Canva execution. Follow these steps in Claude:",
    "",
    "1. Copy the template_design_id from the brief above.",
    "2. Use the Canva merge-designs tool to create a new design from the template pages.",
    "3. Use start-editing-transaction on the new design to get live element IDs.",
    "4. Match each zone's copy to its element ID and push all edits with perform-editing-operations.",
    "5. Commit with commit-editing-transaction.",
    "6. Apply your brand font manually — font family cannot be set via the Canva API.",
    "",
    overages.length > 0
      ? `WARNING: ${overages.length} zone(s) exceeded word count limits and are flagged above. Review before building.`
      : "All word counts validated. Brief is ready to build.",
    "",
    "Villa has prepared this design brief. Review and approve before building in Canva.",
  ].join("\n");

  return output;
}
