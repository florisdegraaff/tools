import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const AUTH_EMAIL_COOKIE_NAME = "auth_user_email";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string) {
  const [salt, storedHash] = storedPassword.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
}

export function getAuthEmailFromRequest(request: Request) {
  const cookieStore = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieStore.match(new RegExp(`(?:^|;\\s*)${AUTH_EMAIL_COOKIE_NAME}=([^;]+)`));
  return cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : "";
}

export function setAuthEmailCookie(response: NextResponse, email: string) {
  response.cookies.set(AUTH_EMAIL_COOKIE_NAME, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
