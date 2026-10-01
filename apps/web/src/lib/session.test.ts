import { describe, expect, it } from "vitest";

import { requireSession, UnauthenticatedError } from "./session.js";

describe("requireSession", () => {
  it("returns the server session without exposing its cookie", async () => {
    const session = await requireSession(async () => ({
      userId: "user-a",
      organizationId: "org-a",
      role: "ADMIN",
      expiresAt: "2099-10-01T12:00:00.000Z",
    }));

    expect(session).toEqual(expect.objectContaining({ organizationId: "org-a", role: "ADMIN" }));
    expect(session).not.toHaveProperty("token");
  });

  it("fails closed when no session exists", async () => {
    await expect(requireSession(async () => null)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
