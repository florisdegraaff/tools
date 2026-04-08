import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  getAuthEmailFromRequest,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  setAuthEmailCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AccountUpdateBody = {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
};

export async function GET(request: Request) {
  const authenticatedEmail = getAuthEmailFromRequest(request);

  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user }, { status: 200 });
}

export async function PATCH(request: Request) {
  let body: AccountUpdateBody;
  try {
    body = (await request.json()) as AccountUpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const authenticatedEmail = getAuthEmailFromRequest(request);

  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentPassword = body.currentPassword;
  const newUsername = body.username?.trim();
  const newEmail = body.email ? normalizeEmail(body.email) : undefined;
  const newPassword = body.newPassword;
  const confirmNewPassword = body.confirmNewPassword;

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true, username: true, email: true, password: true },
  });

  if (!user || !verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const data: { username?: string; email?: string; password?: string } = {};

  if (newUsername !== undefined && newUsername !== (user.username ?? "")) {
    if (newUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long." },
        { status: 400 },
      );
    }
    data.username = newUsername;
  }

  if (newEmail && newEmail !== user.email) {
    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }
    data.email = newEmail;
  }

  if (newPassword || confirmNewPassword) {
    if (!newPassword || !confirmNewPassword) {
      return NextResponse.json(
        { error: "Both new password fields are required." },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 },
      );
    }
    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    }
    data.password = hashPassword(newPassword);
  }

  if (!data.username && !data.email && !data.password) {
    return NextResponse.json(
      { error: "Please provide a new username, email, and/or password." },
      { status: 400 },
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, username: true, email: true },
    });

    const response = NextResponse.json(
      { success: true, user: updatedUser },
      { status: 200 },
    );
    setAuthEmailCookie(response, updatedUser.email);

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That username or email is already in use." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Unable to update account." }, { status: 500 });
  }
}
