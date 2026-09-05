import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

const COOKIE = "donelog-session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const hashSecret = (value: string) => createHash("sha256").update(value).digest("hex");
export type Account = { id: string; login: string };

export async function currentUser(): Promise<Account | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hashSecret(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findById(session.userId);
  return user ? { id: String(user._id), login: user.login } : null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/?mode=login");
  return user;
}

function sessionEncryptionKey(token: string) {
  return createHash("sha256").update(`donelog:session-secret:${token}`).digest();
}

export async function startSession(userId: string, secret: string) {
  const token = randomBytes(32).toString("hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionEncryptionKey(token), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const encryptedSecret = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  // The raw cookie token is needed to decrypt; it is never stored in the database.
  await Session.create({ tokenHash: hashSecret(token), userId, encryptedSecret, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
  const jar = await cookies();
  const previous = jar.get(COOKIE)?.value;
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
  if (previous) await Session.deleteOne({ tokenHash: hashSecret(previous) });
}

export async function currentSessionSecret(userId: string): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hashSecret(token), userId, expiresAt: { $gt: new Date() } }).select("+encryptedSecret");
  if (!session?.encryptedSecret) return null;
  const payload = Buffer.from(session.encryptedSecret, "base64");
  const decipher = createDecipheriv("aes-256-gcm", sessionEncryptionKey(token), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  decipher.setAAD(Buffer.from(userId));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: hashSecret(token) });
  }
  jar.delete(COOKIE);
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function authorizeTaskRequest(request: Request) {
  if (request.method !== "GET" && !sameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to access your journal." }, { status: 401 });
  // A tab opened under another account must never send its queue to this session.
  if (request.headers.get("x-donelog-user") !== user.id) {
    return NextResponse.json({ error: "Your account changed. Reload to continue." }, { status: 409 });
  }
  return user;
}

export async function readAuthBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch { return null; }
}
