import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthEmailFromRequestMock,
  userFindUniqueMock,
  listFindFirstMock,
  listItemFindManyMock,
  listItemUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  getAuthEmailFromRequestMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  listFindFirstMock: vi.fn(),
  listItemFindManyMock: vi.fn(),
  listItemUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthEmailFromRequest: getAuthEmailFromRequestMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    list: { findFirst: listFindFirstMock },
    listItem: {
      findMany: listItemFindManyMock,
      update: listItemUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/lists/[id]/items/reorder/route";

describe("POST /api/lists/[id]/items/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthEmailFromRequestMock.mockReturnValue("user@example.com");
    userFindUniqueMock.mockResolvedValue({ id: "u_1" });
    listFindFirstMock.mockResolvedValue({ id: "l_1" });
  });

  it("returns 400 when itemIds contain duplicates", async () => {
    const request = new Request("http://localhost/api/lists/l_1/items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: ["li_1", "li_1"] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "l_1" }) });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("itemIds must be unique.");
  });

  it("reorders items and returns 200", async () => {
    listItemFindManyMock.mockResolvedValue([{ id: "li_1" }, { id: "li_2" }]);
    listItemUpdateMock.mockImplementation(({ where, data }: { where: { id: string }; data: { position: number } }) =>
      Promise.resolve({ id: where.id, position: data.position }),
    );
    transactionMock.mockResolvedValue([]);

    const request = new Request("http://localhost/api/lists/l_1/items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: ["li_2", "li_1"] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "l_1" }) });
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(listItemUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "li_2" },
      data: { position: 0 },
    });
    expect(listItemUpdateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "li_1" },
      data: { position: 1 },
    });
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
