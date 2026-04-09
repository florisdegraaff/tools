import { NextResponse } from "next/server";
import { getAuthEmailFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReorderListItemsBody = {
  itemIds?: string[];
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: ReorderListItemsBody;
  try {
    body = (await request.json()) as ReorderListItemsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const itemIds = body.itemIds;
  if (!itemIds || itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds is required." }, { status: 400 });
  }

  const uniqueIds = new Set(itemIds);
  if (uniqueIds.size !== itemIds.length) {
    return NextResponse.json({ error: "itemIds must be unique." }, { status: 400 });
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

  const existingItems = await prisma.listItem.findMany({
    where: { listId: list.id },
    select: { id: true },
  });

  if (existingItems.length !== itemIds.length) {
    return NextResponse.json({ error: "itemIds must include all list items." }, { status: 400 });
  }

  const existingIdSet = new Set(existingItems.map((item) => item.id));
  for (const itemId of itemIds) {
    if (!existingIdSet.has(itemId)) {
      return NextResponse.json({ error: "itemIds contain invalid item ids." }, { status: 400 });
    }
  }

  await prisma.$transaction(
    itemIds.map((itemId, index) =>
      prisma.listItem.update({
        where: { id: itemId },
        data: { position: index },
      }),
    ),
  );

  return NextResponse.json({ success: true }, { status: 200 });
}
