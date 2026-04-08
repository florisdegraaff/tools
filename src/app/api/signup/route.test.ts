import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, hashPasswordMock, isValidEmailMock, normalizeEmailMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  isValidEmailMock: vi.fn(),
  normalizeEmailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: createMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: hashPasswordMock,
  isValidEmail: isValidEmailMock,
  normalizeEmail: normalizeEmailMock,
}));

import { POST } from "@/app/api/signup/route";

describe("POST /api/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeEmailMock.mockImplementation((email: string) => email.trim().toLowerCase());
    isValidEmailMock.mockReturnValue(true);
    hashPasswordMock.mockImplementation((password: string) => `hashed:${password}`);
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new Request("http://localhost/api/signup", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Username, email, password, and confirm password are required.");
  });

  it("returns 400 when passwords do not match", async () => {
    const request = new Request("http://localhost/api/signup", {
      method: "POST",
      body: JSON.stringify({
        username: "flori",
        email: "user@example.com",
        password: "password123",
        confirmPassword: "different123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Passwords do not match.");
  });

  it("creates user and returns 201 for valid payload", async () => {
    createMock.mockResolvedValue({ id: "u_1" });

    const request = new Request("http://localhost/api/signup", {
      method: "POST",
      body: JSON.stringify({
        username: "flori",
        email: " USER@example.com ",
        password: "password123",
        confirmPassword: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        username: "flori",
        email: "user@example.com",
        password: "hashed:password123",
      },
    });
  });
});
