import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEditionBySlug, getAssistantVerdict, saveAssistantVerdict, getConnectionsForEdition, getPrerequisites } from "@/lib/data";
import type { AssistantVerdictData } from "@/lib/data";

const RATE_LIMIT_PER_HOUR = 20;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  // Validate auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Parse request
  let body: { editionSlug: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { editionSlug } = body;
  if (!editionSlug || typeof editionSlug !== "string") {
    return NextResponse.json({ error: "editionSlug is required" }, { status: 400 });
  }

  // Check cache first
  const cached = await getAssistantVerdict(editionSlug);
  if (cached) {
    return NextResponse.json({ verdict: cached.verdict, cached: true });
  }

  // Rate limiting (shares the 20/hr pool with chat)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("watcher_queries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  const queryCount = count ?? 0;
  if (queryCount >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later.", remaining: 0 },
      { status: 429 }
    );
  }

  // Get edition data
  const edition = await getEditionBySlug(editionSlug);
  if (!edition) {
    return NextResponse.json({ error: "Edition not found" }, { status: 404 });
  }

  const [connections, prerequisites] = await Promise.all([
    getConnectionsForEdition(editionSlug),
    getPrerequisites(editionSlug),
  ]);

  // Log as a watcher query (counts toward rate limit)
  await supabase.from("watcher_queries").insert({
    user_id: user.id,
    question: `[verdict] ${editionSlug}`,
  });

  // Build prompt for structured verdict
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
    connections.incoming.length > 0
      ? `Follows: ${connections.incoming.slice(0, 5).map((c) => c.source_title).join(", ")}`
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

  const anthropicResponse = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
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
    }
  );

  if (!anthropicResponse.ok) {
    console.error("Anthropic API error for verdict:", anthropicResponse.status);
    return NextResponse.json(
      { error: "Failed to generate verdict" },
      { status: 502 }
    );
  }

  const result = await anthropicResponse.json();
  const text = result.content?.[0]?.text || "";

  // Parse JSON from response (may have markdown wrapping)
  let verdict: AssistantVerdictData;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    verdict = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse verdict JSON:", text.slice(0, 200));
    return NextResponse.json(
      { error: "Failed to parse verdict" },
      { status: 502 }
    );
  }

  // Cache the verdict
  await saveAssistantVerdict(editionSlug, verdict, "claude-sonnet-4-5-20250929");

  return NextResponse.json({
    verdict,
    cached: false,
    remaining: RATE_LIMIT_PER_HOUR - queryCount - 1,
  });
}
