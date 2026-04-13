import { NextResponse } from "next/server";
import { getLiveConfig } from "@/lib/store";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  const { id } = await params;
  const liveConfig = await getLiveConfig(id);

  if (!liveConfig) {
    return NextResponse.json(
      { error: "Match not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(liveConfig);
}
