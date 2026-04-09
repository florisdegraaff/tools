import { NextResponse } from "next/server";
import { getAuthEmailFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UpdateListItemBody = {
  name?: string;
  quantity?: number;
  done?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id, itemId } = await context.params;

  let body: UpdateListItemBody;
  try {
    body = (await request.json()) as UpdateListItemBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const authenticatedEmail = getAuthEmailFromRequest(request);
  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const list = await prisma.list.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }

  const existingItem = await prisma.listItem.findFirst({
    where: { id: itemId, listId: list.id },
    select: { id: true },
  });

  if (!existingItem) {
    return NextResponse.json({ error: "List item not found." }, { status: 404 });
  }

  const data: { name?: string; quantity?: number; done?: boolean } = {};

  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Item name cannot be empty." }, { status: 400 });
    }
    data.name = trimmedName;
  }

  if (body.quantity !== undefined) {
    if (!Number.isInteger(body.quantity) || body.quantity < 1) {
      return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 });
    }
    data.quantity = body.quantity;
  }

  if (body.done !== undefined) {
    data.done = body.done;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const item = await prisma.listItem.update({
    where: { id: itemId },
    data,
    select: {
      id: true,
      listId: true,
      name: true,
      quantity: true,
      done: true,
      position: true,
    },
  });

  return NextResponse.json({ success: true, item }, { status: 200 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, itemId } = await context.params;

  const authenticatedEmail = getAuthEmailFromRequest(request);
  if (!authenticatedEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const list = await prisma.list.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }

  const existingItem = await prisma.listItem.findFirst({
    where: { id: itemId, listId: list.id },
    select: { id: true },
  });

  if (!existingItem) {
    return NextResponse.json({ error: "List item not found." }, { status: 404 });
  }

  await prisma.listItem.delete({
    where: { id: itemId },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
