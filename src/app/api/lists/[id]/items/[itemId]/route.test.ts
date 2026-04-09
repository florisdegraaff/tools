import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthEmailFromRequestMock,
  userFindUniqueMock,
  listFindFirstMock,
  itemFindFirstMock,
  itemUpdateMock,
  itemDeleteMock,
} = vi.hoisted(() => ({
  getAuthEmailFromRequestMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  listFindFirstMock: vi.fn(),
  itemFindFirstMock: vi.fn(),
  itemUpdateMock: vi.fn(),
  itemDeleteMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthEmailFromRequest: getAuthEmailFromRequestMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    list: { findFirst: listFindFirstMock },
    listItem: {
      findFirst: itemFindFirstMock,
      update: itemUpdateMock,
      delete: itemDeleteMock,
    },
  },
}));

import { DELETE, PATCH } from "@/app/api/lists/[id]/items/[itemId]/route";

describe("PATCH /api/lists/[id]/items/[itemId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");
    userFindUniqueMock.mockResolvedValue({ id: "u_1" });
    listFindFirstMock.mockResolvedValue({ id: "l_1" });
    itemFindFirstMock.mockResolvedValue({ id: "li_1" });
  });

  it("returns 400 when no valid fields are provided", async () => {
    const request = new Request("http://localhost/api/lists/l_1/items/li_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "l_1", itemId: "li_1" }),
    });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("No valid fields to update.");
  });

  it("updates list item and returns 200", async () => {
    itemUpdateMock.mockResolvedValue({
      id: "li_1",
      listId: "l_1",
      name: "Tomatoes",
      quantity: 3,
      done: true,
      position: 1,
    });

    const request = new Request("http://localhost/api/lists/l_1/items/li_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 3, done: true }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "l_1", itemId: "li_1" }),
    });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(itemUpdateMock).toHaveBeenCalledWith({
      where: { id: "li_1" },
      data: { quantity: 3, done: true },
      select: {
        id: true,
        listId: true,
        name: true,
        quantity: true,
        done: true,
        position: true,
      },
    });
  });
});

describe("DELETE /api/lists/[id]/items/[itemId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");
    userFindUniqueMock.mockResolvedValue({ id: "u_1" });
    listFindFirstMock.mockResolvedValue({ id: "l_1" });
    itemFindFirstMock.mockResolvedValue({ id: "li_1" });
  });

  it("deletes list item and returns 200", async () => {
    const request = new Request("http://localhost/api/lists/l_1/items/li_1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "l_1", itemId: "li_1" }),
    });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(itemDeleteMock).toHaveBeenCalledWith({
      where: { id: "li_1" },
    });
  });
});
