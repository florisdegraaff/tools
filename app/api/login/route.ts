import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { decryptLoginPassword } from "@/lib/login-crypto-server";

export const runtime = "nodejs";

function sha256Utf8(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function passwordsMatch(supplied: string, expected: string): boolean {
  const a = sha256Utf8(supplied);
  const b = sha256Utf8(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.LOGIN_PASSWORD;
  if (expected === undefined || expected === "") {
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 500 },
    );
  }

  const privateKeyPem = process.env.LOGIN_RSA_PRIVATE_KEY;
  if (privateKeyPem === undefined || privateKeyPem === "") {
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const encryptedPassword =
    typeof body === "object" &&
    body !== null &&
    "encryptedPassword" in body &&
    typeof (body as { encryptedPassword: unknown }).encryptedPassword === "string"
      ? (body as { encryptedPassword: string }).encryptedPassword
      : undefined;

  if (encryptedPassword === undefined || encryptedPassword === "") {
    return NextResponse.json(
      { error: "Encrypted password is required" },
      { status: 400 },
    );
  }

  let ciphertext: Buffer;
  try {
    ciphertext = Buffer.from(encryptedPassword, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (ciphertext.length === 0) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  let password: string;
  try {
    password = decryptLoginPassword(privateKeyPem, ciphertext);
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (!passwordsMatch(password, expected)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
