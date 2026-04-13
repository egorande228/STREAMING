import { NextResponse } from "next/server";
import { addSubscription } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    channel: "email" | "telegram" | "whatsapp" | "push";
    value: string;
    matchId?: string;
  };
  await addSubscription(body.channel, body.value, body.matchId);
  return NextResponse.json({ ok: true });
}
