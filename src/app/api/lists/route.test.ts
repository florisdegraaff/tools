import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthEmailFromRequestMock, findUniqueMock, createMock } = vi.hoisted(() => ({
  getAuthEmailFromRequestMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthEmailFromRequest: getAuthEmailFromRequestMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
    list: {
      create: createMock,
    },
  },
}));

import { POST } from "@/app/api/lists/route";

describe("POST /api/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when request is unauthenticated", async () => {
    getAuthEmailFromRequestMock.mockReturnValue("");

    const request = new Request("http://localhost/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Weekly groceries" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized.");
  });

  it("returns 400 when list name is missing", async () => {
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");

    const request = new Request("http://localhost/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("List name is required.");
  });

  it("creates list for authenticated user", async () => {
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");
    findUniqueMock.mockResolvedValue({ id: "u_1" });
    createMock.mockResolvedValue({
      id: "l_1",
      name: "Weekly groceries",
      userId: "u_1",
    });

    const request = new Request("http://localhost/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Weekly groceries  " }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      success: boolean;
      list: { id: string; name: string; userId: string };
    };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Weekly groceries",
        userId: "u_1",
      },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });
  });
});
