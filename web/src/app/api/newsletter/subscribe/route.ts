import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: NextRequest) {
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

  let body: { action: "subscribe" | "unsubscribe" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action } = body;
  if (action !== "subscribe" && action !== "unsubscribe") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "subscribe") {
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        user_id: user.id,
        email: user.email || "",
        is_active: true,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Newsletter subscribe error:", error.message);
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ subscribed: true });
  }

  // Unsubscribe
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ is_active: false })
    .eq("user_id", user.id);

  if (error) {
    console.error("Newsletter unsubscribe error:", error.message);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }

  return NextResponse.json({ subscribed: false });
}

// GET: check subscription status
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ subscribed: false });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ subscribed: false });
  }

  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("is_active")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ subscribed: data?.is_active ?? false });
}
