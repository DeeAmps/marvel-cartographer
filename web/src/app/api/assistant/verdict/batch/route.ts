import { NextRequest, NextResponse } from "next/server";
import { getEditions, getAssistantVerdict, getEditionBySlug, getConnectionsForEdition, getPrerequisites, saveAssistantVerdict } from "@/lib/data";
import type { AssistantVerdictData } from "@/lib/data";

export async function POST(request: NextRequest) {
  // Admin-only: verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("x-cron-secret");

  if (!cronSecret || authHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  const editions = await getEditions();
  const essentialEditions = editions.filter((e) => e.importance === "essential");

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const edition of essentialEditions) {
    // Check if already cached
    const cached = await getAssistantVerdict(edition.slug);
    if (cached) {
      skipped++;
      continue;
    }

    // Rate limit: 2s between calls
    if (generated > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    try {
      const [connections, prerequisites] = await Promise.all([
        getConnectionsForEdition(edition.slug),
        getPrerequisites(edition.slug),
      ]);

      const contextParts = [
        `Title: ${edition.title}`,
        `Issues: ${edition.issues_collected}`,
        `Issue Count: ${edition.issue_count}`,
        `Format: ${edition.format}`,
        `Importance: ${edition.importance}`,
        `Print Status: ${edition.print_status}`,
        `Cover Price: $${edition.cover_price?.toFixed(2) || "N/A"}`,
        `Creators: ${edition.creator_names?.join(", ") || "Unknown"}`,
        `Synopsis: ${edition.synopsis}`,
        edition.connection_notes ? `Connections: ${edition.connection_notes}` : "",
        connections.outgoing.length > 0
          ? `Leads to: ${connections.outgoing.slice(0, 5).map((c) => c.target_title).join(", ")}`
          : "",
        prerequisites.length > 0
          ? `Prerequisites: ${prerequisites.map((p) => `${p.edition_title} (${p.category})`).join(", ")}`
          : "",
      ].filter(Boolean);

      const prompt = `Analyze this Marvel collected edition and return a JSON verdict.

EDITION DATA:
${contextParts.join("\n")}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "rating": <number 1-5>,
  "one_sentence": "<one sentence review>",
  "who_for": ["<audience type 1>", "<audience type 2>", "<audience type 3>"],
  "who_skip": ["<skip reason 1>", "<skip reason 2>"],
  "continuity_impact": <number 1-10>,
  "continuity_sets_up": ["<future story 1>", "<future story 2>"],
  "continuity_changes": ["<change 1>"],
  "value_per_issue": "<calculated $/issue or 'N/A'>",
  "value_verdict": "<one sentence on value>",
  "deep_cut": "<one interesting continuity fact most readers miss>",
  "prerequisites": ["<edition title 1>", "<edition title 2>"]
}`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) {
        failed++;
        continue;
      }

      const result = await resp.json();
      const text = result.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        failed++;
        continue;
      }

      const verdict: AssistantVerdictData = JSON.parse(jsonMatch[0]);
      await saveAssistantVerdict(edition.slug, verdict, "claude-sonnet-4-5-20250929");
      generated++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    total: essentialEditions.length,
    generated,
    skipped,
    failed,
  });
}
