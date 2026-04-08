import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueMock,
  isValidEmailMock,
  normalizeEmailMock,
  setAuthEmailCookieMock,
  verifyPasswordMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  isValidEmailMock: vi.fn(),
  normalizeEmailMock: vi.fn(),
  setAuthEmailCookieMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  isValidEmail: isValidEmailMock,
  normalizeEmail: normalizeEmailMock,
  setAuthEmailCookie: setAuthEmailCookieMock,
  verifyPassword: verifyPasswordMock,
}));

import { POST } from "@/app/api/login/route";

describe("POST /api/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeEmailMock.mockImplementation((email: string) => email.trim().toLowerCase());
    isValidEmailMock.mockReturnValue(true);
  });

  it("returns 400 when email or password is missing", async () => {
    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Email and password are required.");
  });

  it("returns 401 for invalid credentials", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u_1",
      email: "user@example.com",
      password: "stored-hash",
    });
    verifyPasswordMock.mockReturnValue(false);

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "wrong-pass" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid email or password.");
  });

  it("returns 200 and sets auth cookie for valid credentials", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u_1",
      username: "flori",
      email: "user@example.com",
      password: "stored-hash",
    });
    verifyPasswordMock.mockReturnValue(true);

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "correct-pass" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      success: boolean;
      user: { id: string; username: string; email: string };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("user@example.com");
    expect(setAuthEmailCookieMock).toHaveBeenCalledOnce();
  });
});
