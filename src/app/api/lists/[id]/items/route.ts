import { NextResponse } from "next/server";
import { getAuthEmailFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CreateListItemBody = {
  name?: string;
  quantity?: number;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: CreateListItemBody;
  try {
    body = (await request.json()) as CreateListItemBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const authenticatedEmail = getAuthEmailFromRequest(request);
  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const name = body.name?.trim();
  const quantity = Number(body.quantity ?? 1);

  if (!name) {
    return NextResponse.json({ error: "Item name is required." }, { status: 400 });
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const list = await prisma.list.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }

  const positionResult = await prisma.listItem.aggregate({
    where: { listId: list.id },
    _max: { position: true },
  });

  const nextPosition = (positionResult._max.position ?? -1) + 1;

  const item = await prisma.listItem.create({
    data: {
      listId: list.id,
      name,
      quantity,
      position: nextPosition,
    },
    select: {
      id: true,
      listId: true,
      name: true,
      quantity: true,
      done: true,
      position: true,
    },
  });

  return NextResponse.json({ success: true, item }, { status: 201 });
}
