import { NextResponse } from "next/server";
import { hashSecret, readAuthBody, sameOrigin, startSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const body = await readAuthBody(request);
  const secret = typeof body?.secret === "string" ? body.secret.trim() : "";
  if (!/^done_[a-f0-9]{64}$/.test(secret)) return NextResponse.json({ error: "Invalid authorization key. Check the key and try again." }, { status: 401 });
  try {
    await connectDB();
    const user = await User.findOne({ secretHash: hashSecret(secret) });
    if (!user) return NextResponse.json({ error: "Invalid authorization key. Check the key and try again." }, { status: 401 });
    await startSession(String(user._id), secret);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
  }
}
