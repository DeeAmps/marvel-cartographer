import { NextRequest, NextResponse } from "next/server";
import { findOverlaps } from "@/lib/data";

const GRAPH_SERVICE_URL = process.env.GO_GRAPH_SERVICE_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Handle action-based requests (used by client components)
  if (action === "overlap" || action === "overlap-local") {
    const editionsParam = action === "overlap"
      ? searchParams.get("editions") || ""
      : searchParams.get("edition") || "";
    const slugs = editionsParam.split(",").filter(Boolean);
    if (slugs.length === 0) {
      return NextResponse.json({ overlaps: [], total: 0 });
    }
    try {
      const result = await findOverlaps(slugs);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ overlaps: [], total: 0 });
    }
  }

  if (action === "price-history") {
    // Price history requires the Go service or DB — return empty for now
    const editionSlug = searchParams.get("edition") || "";
    try {
      const resp = await fetch(
        `${GRAPH_SERVICE_URL}/api/v1/graph/price-history/${editionSlug}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
      );
      if (resp.ok) {
        const data = await resp.json();
        return NextResponse.json(data);
      }
    } catch {
      // Go service unavailable — return empty history
    }
    return NextResponse.json({ history: [] });
  }

  // Default: proxy to Go graph service via ?path=
  const path = searchParams.get("path") || "";
  const targetUrl = `${GRAPH_SERVICE_URL}/api/v1${path}`;

  try {
    const resp = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Graph service returned ${resp.status}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Graph service unavailable", details: String(err) },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "";
  const targetUrl = `${GRAPH_SERVICE_URL}/api/v1${path}`;

  try {
    const body = await request.json();
    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Graph service returned ${resp.status}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Graph service unavailable", details: String(err) },
      { status: 503 }
    );
  }
}
