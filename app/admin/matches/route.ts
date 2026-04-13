import { NextResponse } from "next/server";
import { createMatch } from "@/lib/store";

export async function POST(request: Request) {
  const formData = await request.formData();

  await createMatch({
    homeTeam: String(formData.get("homeTeam") ?? ""),
    awayTeam: String(formData.get("awayTeam") ?? ""),
    competition: String(formData.get("competition") ?? ""),
    startAt: new Date(String(formData.get("startAt") ?? "")).toISOString(),
    status: String(formData.get("status") ?? "test match") as
      | "test match"
      | "upcoming"
      | "live"
      | "ended",
    summary: String(formData.get("summary") ?? ""),
    heroImage: String(formData.get("heroImage") ?? "")
  });

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
