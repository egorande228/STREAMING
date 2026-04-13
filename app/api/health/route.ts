import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";

export async function GET() {
  const db = await getDb();

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    matches: db.matches.length,
    activeSources: db.sources.filter((item) => item.isActive).length,
    primaryDomain: db.siteConfig.primaryDomain,
    backupDomain: db.siteConfig.backupDomain
  });
}
