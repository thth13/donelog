import { NextResponse } from "next/server";
import { hashSecret, readAuthBody, sameOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { normalizeLogin, validLogin } from "@/lib/account-input";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const body = await readAuthBody(request);
  const login = typeof body?.login === "string" ? normalizeLogin(body.login) : "";
  if (!validLogin(login)) {
    return NextResponse.json({ error: "Use 2–40 letters, numbers, spaces, dots, hyphens or underscores." }, { status: 400 });
  }
  if (login === "thth13") return NextResponse.json({ error: "This name is reserved. Sign in with your authorization key." }, { status: 409 });
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  if (!/^[a-f0-9]{64}$/.test(requestId)) return NextResponse.json({ error: "Invalid registration request. Reload and try again." }, { status: 400 });
  // A private random request ID makes a lost response safely retryable in this tab.
  const secret = `done_${hashSecret(`donelog-registration:${login}:${requestId}`)}`;
  try {
    await connectDB();
    if (!await User.exists({ login: "thth13" })) {
      return NextResponse.json({ error: "Account setup is not finished yet. Please try again later." }, { status: 503 });
    }
    await User.init();
    if (!await User.exists({ login, secretHash: hashSecret(secret) })) {
      await User.create({ login, secretHash: hashSecret(secret) });
    }
    // Sign in only after the user has saved the key. No secret enters client storage.
    return NextResponse.json({ login, secret }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "This name is taken. Choose another name or sign in." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
