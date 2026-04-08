import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/logout/route";

describe("POST /api/logout", () => {
  it("returns success and clears auth cookie", async () => {
    const response = await POST();
    const body = (await response.json()) as { success: boolean };
    const setCookieHeader = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(setCookieHeader).toContain("auth_user_email=");
  });
});
