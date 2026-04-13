import { NextResponse } from "next/server";
import { recordAnalytics } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: "match_view" | "source_click" | "embed_attempt" | "backup_switch";
    matchId?: string;
    sourceId?: string;
    locale?: string;
    device?: string;
    country?: string;
  };

  const event = await recordAnalytics(body);
  return NextResponse.json({ ok: true, event });
}
