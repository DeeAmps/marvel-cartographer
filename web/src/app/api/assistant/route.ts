import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAssistantSearchContext, getAssistantPageContextData } from "@/lib/data";
import {
  buildContextString,
  buildPageContextString,
  ASSISTANT_SYSTEM_PROMPT,
  type AssistantPageContext,
} from "@/lib/assistant-context";

const RATE_LIMIT_PER_HOUR = 20;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

interface ConversationMessage {
  role: "user" | "watcher";
  content: string;
}

export async function POST(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return Response.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  // Validate auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  // Parse request
  let body: {
    question: string;
    conversationHistory?: ConversationMessage[];
    pageContext?: AssistantPageContext;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { question, conversationHistory, pageContext } = body;
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return Response.json({ error: "Question is required" }, { status: 400 });
  }

  if (question.length > 1000) {
    return Response.json(
      { error: "Question too long (max 1000 characters)" },
      { status: 400 }
    );
  }

  // Rate limiting
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("watcher_queries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (countError) {
    console.error("Rate limit check error:", countError.message);
  }

  const queryCount = count ?? 0;
  if (queryCount >= RATE_LIMIT_PER_HOUR) {
    return Response.json(
      {
        error: `Rate limit exceeded. ${RATE_LIMIT_PER_HOUR} questions per hour. Try again later.`,
        remaining: 0,
      },
      { status: 429 }
    );
  }

  // Build context — page-aware if pageContext provided, else keyword search
  let contextString: string;
  if (pageContext && pageContext.pageType !== "general") {
    const pageData = await getAssistantPageContextData(pageContext);
    contextString = buildPageContextString(pageContext, pageData, question.trim());
  } else {
    const searchContext = await getAssistantSearchContext(question.trim());
    contextString = buildContextString(searchContext, question.trim());
  }

  // Log query
  await supabase.from("watcher_queries").insert({
    user_id: user.id,
    question: question.trim(),
  });

  // Build messages array with conversation history
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Add conversation history (cap at 10 messages, ~6000 chars total)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10);
    let totalChars = 0;
    const cappedHistory: ConversationMessage[] = [];

    for (let i = recentHistory.length - 1; i >= 0; i--) {
      const msg = recentHistory[i];
      if (totalChars + msg.content.length > 6000) break;
      totalChars += msg.content.length;
      cappedHistory.unshift(msg);
    }

    for (const msg of cappedHistory) {
      messages.push({
        role: msg.role === "watcher" ? "assistant" : "user",
        content: msg.content,
      });
    }
  }

  // Add current question with context
  messages.push({
    role: "user",
    content: `${contextString}\n\n---\n\nQuestion: ${question.trim()}`,
  });

  // Call Anthropic API with streaming
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
        max_tokens: 1500,
        system: ASSISTANT_SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    }
  );

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    console.error("Anthropic API error:", anthropicResponse.status, errorText);
    const detail =
      anthropicResponse.status === 401
        ? "Invalid API key"
        : anthropicResponse.status === 429
          ? "API rate limit exceeded — try again in a moment"
          : anthropicResponse.status === 400
            ? "Invalid request to AI model"
            : "Failed to get response from the AI assistant";
    return Response.json(
      { error: detail, status: anthropicResponse.status },
      { status: 502 }
    );
  }

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (
                  parsed.type === "content_block_delta" &&
                  parsed.delta?.type === "text_delta"
                ) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`
                    )
                  );
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Watcher-Remaining": String(
        RATE_LIMIT_PER_HOUR - queryCount - 1
      ),
    },
  });
}
