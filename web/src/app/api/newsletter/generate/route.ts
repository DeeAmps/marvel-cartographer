import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getEditions } from "@/lib/data";
import { buildNewsletterHtml } from "@/lib/newsletter-template";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: NextRequest) {
  // Auth via CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("x-cron-secret");

  if (!cronSecret || authHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!anthropicKey || !resendKey) {
    return NextResponse.json(
      { error: "Missing API keys (ANTHROPIC_API_KEY or RESEND_API_KEY)" },
      { status: 500 }
    );
  }

  const resend = new Resend(resendKey);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get active subscribers
  const { data: subscribers, error: subErr } = await supabase
    .from("newsletter_subscribers")
    .select("user_id, email")
    .eq("is_active", true);

  if (subErr || !subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No active subscribers" });
  }

  // Get edition data for recommendations
  const editions = await getEditions();
  const essentialEditions = editions.filter((e) => e.importance === "essential");

  // Get trending: most added editions this week across all users
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trendingData } = await supabase
    .from("user_collections")
    .select("edition_id")
    .gte("added_at", oneWeekAgo);

  const editionCounts = new Map<string, number>();
  for (const row of trendingData || []) {
    const id = row.edition_id as string;
    editionCounts.set(id, (editionCounts.get(id) || 0) + 1);
  }
  const editionMap = new Map(editions.map((e) => [e.id, e]));
  const trending = Array.from(editionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => editionMap.get(id))
    .filter(Boolean);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://marvelcartographer.com";
  let sent = 0;
  let failed = 0;

  // Process in batches of 5
  for (let i = 0; i < subscribers.length; i += 5) {
    const batch = subscribers.slice(i, i + 5);

    if (i > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    for (const subscriber of batch) {
      try {
        // Get user's collection
        const { data: collection } = await supabase
          .from("user_collections")
          .select("edition_id, status")
          .eq("user_id", subscriber.user_id);

        const ownedIds = new Set(
          (collection || []).map((c) => c.edition_id as string)
        );

        // Find un-owned essential editions for recommendations
        const unownedEssentials = essentialEditions.filter(
          (e) => !ownedIds.has(e.id)
        );

        // Pick a random essential as weekly pick
        const weeklyPick =
          unownedEssentials.length > 0
            ? unownedEssentials[Math.floor(Math.random() * unownedEssentials.length)]
            : essentialEditions[Math.floor(Math.random() * essentialEditions.length)];

        // Call Claude for personalized recommendation (~500 tokens)
        const context = `User owns ${ownedIds.size} editions. They haven't read: ${unownedEssentials.slice(0, 5).map((e) => e.title).join(", ")}. Weekly pick: ${weeklyPick.title}.`;

        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 500,
            messages: [
              {
                role: "user",
                content: `You are The Watcher. Write two brief items for a weekly newsletter:

1. A personalized recommendation sentence (1-2 sentences) for why this reader should try "${weeklyPick.title}" next, based on their collection.
2. A fun Marvel continuity fact (1 sentence).

Context: ${context}

Return JSON: {"recommendation": "...", "continuity_fact": "..."}`,
              },
            ],
          }),
        });

        let recommendation = `Based on your collection, ${weeklyPick.title} would be an excellent next read.`;
        let continuityFact = "The Marvel Universe has been continuously published since Fantastic Four #1 in November 1961.";

        if (aiResp.ok) {
          const aiResult = await aiResp.json();
          const text = aiResult.content?.[0]?.text || "";
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.recommendation) recommendation = parsed.recommendation;
              if (parsed.continuity_fact) continuityFact = parsed.continuity_fact;
            }
          } catch {
            // Use defaults
          }
        }

        const html = buildNewsletterHtml({
          userName: subscriber.email.split("@")[0],
          weeklyPick: {
            title: weeklyPick.title,
            slug: weeklyPick.slug,
            one_sentence: weeklyPick.synopsis.split(".")[0] + ".",
            importance: weeklyPick.importance,
          },
          collectionRecommendation: recommendation,
          trending: trending.map((t) => ({ title: t!.title, slug: t!.slug })),
          continuityFact,
          unsubscribeUrl: `${baseUrl}/collection`,
        });

        const subject = `The Watcher's Weekly: ${weeklyPick.title}`;

        await resend.emails.send({
          from: "The Watcher <watcher@marvelcartographer.com>",
          to: subscriber.email,
          subject,
          html,
        });

        // Log send
        await supabase.from("newsletter_sends").insert({
          user_id: subscriber.user_id,
          subject,
        });

        sent++;
      } catch (err) {
        console.error("Newsletter send error for", subscriber.email, err);
        failed++;
      }
    }
  }

  return NextResponse.json({ sent, failed, total: subscribers.length });
}
