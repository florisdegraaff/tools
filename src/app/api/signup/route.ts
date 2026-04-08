import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashPassword, isValidEmail, normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SignupBody = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  let body: SignupBody;

  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const username = body.username?.trim();
  const email = body.email ? normalizeEmail(body.email) : undefined;
  const password = body.password;
  const confirmPassword = body.confirmPassword;

  if (!username || !email || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "Username, email, password, and confirm password are required." },
      { status: 400 },
    );
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters long." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  try {
    await prisma.user.create({
      data: {
        username,
        email,
        password: hashPassword(password),
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email or username already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
