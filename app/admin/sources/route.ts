import { NextResponse } from "next/server";
import { createSource } from "@/lib/store";

export async function POST(request: Request) {
  const formData = await request.formData();

  await createSource({
    matchId: String(formData.get("matchId") ?? ""),
    providerName: String(formData.get("providerName") ?? ""),
    url: String(formData.get("url") ?? ""),
    type: String(formData.get("type") ?? "redirect") as "embed" | "redirect",
    priority: Number(formData.get("priority") ?? 2),
    state: String(formData.get("state") ?? "backup") as
      | "primary"
      | "backup"
      | "disabled",
    showEmbed: String(formData.get("showEmbed") ?? "") === "true"
  });

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
