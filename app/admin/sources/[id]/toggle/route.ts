import { NextResponse } from "next/server";
import { toggleSourceState } from "@/lib/store";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const formData = await request.formData();
  const nextState = String(formData.get("state") ?? "backup") as
    | "primary"
    | "backup"
    | "disabled";

  await toggleSourceState(id, nextState);
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
