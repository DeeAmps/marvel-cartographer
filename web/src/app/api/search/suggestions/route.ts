import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/data";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase().trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await getSearchSuggestions(q);

    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } }
    );
  } catch (e) {
    console.error("Search suggestions error:", e);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
