import { NextResponse } from "next/server";
import { authorizeTaskRequest, currentSessionSecret } from "@/lib/auth";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    const secret = await currentSessionSecret(user.id);
    if (!secret) {
      return NextResponse.json({ error: "Sign out and sign in with your key once to enable copying it here." }, { status: 409, headers });
    }
    const preview = `${secret.slice(0, 9)}…${secret.slice(-4)}`;
    return NextResponse.json(new URL(request.url).searchParams.get("preview") === "1" ? { preview } : { secret, preview }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not load your key. Please try again." }, { status: 500, headers });
  }
}
