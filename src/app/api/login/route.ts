import { NextResponse } from "next/server";
import {
  isValidEmail,
  normalizeEmail,
  setAuthEmailCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = body.email ? normalizeEmail(body.email) : undefined;
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, password: true },
  });

  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json(
    { success: true, user: { id: user.id, username: user.username, email: user.email } },
    { status: 200 },
  );
  setAuthEmailCookie(response, user.email);

  return response;
}
