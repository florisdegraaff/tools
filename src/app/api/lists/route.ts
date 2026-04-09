import { NextResponse } from "next/server";
import { getAuthEmailFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CreateListBody = {
  name?: string;
};

export async function POST(request: Request) {
  let body: CreateListBody;
  try {
    body = (await request.json()) as CreateListBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const authenticatedEmail = getAuthEmailFromRequest(request);
  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "List name is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const list = await prisma.list.create({
    data: {
      name,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      userId: true,
    },
  });

  return NextResponse.json({ success: true, list }, { status: 201 });
}
