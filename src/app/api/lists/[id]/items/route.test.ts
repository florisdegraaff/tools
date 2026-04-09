import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthEmailFromRequestMock,
  findUniqueMock,
  findFirstMock,
  aggregateMock,
  createMock,
} = vi.hoisted(() => ({
  getAuthEmailFromRequestMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstMock: vi.fn(),
  aggregateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthEmailFromRequest: getAuthEmailFromRequestMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUniqueMock },
    list: { findFirst: findFirstMock },
    listItem: {
      aggregate: aggregateMock,
      create: createMock,
    },
  },
}));

import { POST } from "@/app/api/lists/[id]/items/route";

describe("POST /api/lists/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid quantity", async () => {
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");

    const request = new Request("http://localhost/api/lists/l_1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Tomatoes", quantity: 0 }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "l_1" }) });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Quantity must be a positive integer.");
  });

  it("creates list item with incremented position", async () => {
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");
    findUniqueMock.mockResolvedValue({ id: "u_1" });
    findFirstMock.mockResolvedValue({ id: "l_1" });
    aggregateMock.mockResolvedValue({ _max: { position: 3 } });
    createMock.mockResolvedValue({
      id: "li_1",
      listId: "l_1",
      name: "Tomatoes",
      quantity: 2,
      done: false,
      position: 4,
    });

    const request = new Request("http://localhost/api/lists/l_1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Tomatoes  ", quantity: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "l_1" }) });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        listId: "l_1",
        name: "Tomatoes",
        quantity: 2,
        position: 4,
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
  });
});
