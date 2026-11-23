import { describe, expect, it, vi } from "vitest";

import { WhatsAppController } from "../src/modules/whatsapp/whatsapp.controller.js";

const session = {
  userId: "user-1",
  organizationId: "org-1",
  role: "OWNER" as const,
  expiresAt: new Date("2026-12-01T00:00:00Z"),
};

function createController() {
  const database = {
    organizationMember: {
      findUnique: vi.fn().mockResolvedValue({ organizationId: session.organizationId, status: "ACTIVE" }),
    },
    whatsAppAccount: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    whatsAppNumber: {
      upsert: vi.fn(),
    },
  };
  const sessions = {
    requireSession: vi.fn().mockResolvedValue(session),
  };

  return {
    controller: new WhatsAppController(database as never, sessions as never),
    database,
    sessions,
  };
}

describe("WhatsAppController connections", () => {
  it("rejects a request without a session before accessing tenant data", async () => {
    const { controller, database, sessions } = createController();
    sessions.requireSession.mockRejectedValue(new Error("Authentication required"));

    await expect(controller.connections(undefined)).rejects.toThrow("Authentication required");
    expect(sessions.requireSession).toHaveBeenCalledWith(undefined);
    expect(database.organizationMember.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a session whose organization membership is inactive", async () => {
    const { controller, database } = createController();
    database.organizationMember.findUnique.mockResolvedValue({ organizationId: session.organizationId, status: "SUSPENDED" });

    await expect(controller.connections("saas_lead_session=session-token")).rejects.toThrow("Authentication required");
    expect(database.whatsAppAccount.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["externalAccountId", { credentialReference: "secret-ref", externalNumberId: "number-1" }],
    ["credentialReference", { externalAccountId: "account-1", externalNumberId: "number-1" }],
    ["externalNumberId", { externalAccountId: "account-1", credentialReference: "secret-ref" }],
  ] as const)("validates the required %s field", async (_field, body) => {
    const { controller, database } = createController();

    await expect(controller.connect("saas_lead_session=session-token", body)).rejects.toThrow();
    expect(database.whatsAppAccount.upsert).not.toHaveBeenCalled();
    expect(database.whatsAppNumber.upsert).not.toHaveBeenCalled();
  });

  it("rejects credential references longer than 200 characters", async () => {
    const { controller, database } = createController();

    await expect(
      controller.connect("saas_lead_session=session-token", {
        externalAccountId: "account-1",
        credentialReference: "x".repeat(201),
        externalNumberId: "number-1",
      }),
    ).rejects.toThrow("credentialReference is required");
    expect(database.whatsAppAccount.upsert).not.toHaveBeenCalled();
  });

  it("upserts the account and number in the authenticated organization", async () => {
    const { controller, database } = createController();
    database.whatsAppAccount.upsert.mockResolvedValue({ id: "account-db-1" });
    database.whatsAppNumber.upsert.mockResolvedValue({ id: "number-db-1" });

    await expect(
      controller.connect("saas_lead_session=session-token", {
        externalAccountId: "account-1",
        credentialReference: "secret-ref",
        externalNumberId: "number-1",
        displayNumber: "+55 11 99999-0000",
      }),
    ).resolves.toEqual({ accountId: "account-db-1", numberId: "number-db-1", status: "ACTIVE" });

    expect(database.whatsAppAccount.upsert).toHaveBeenCalledWith({
      where: { externalAccountId: "account-1" },
      create: {
        organizationId: "org-1",
        externalAccountId: "account-1",
        credentialReference: "secret-ref",
      },
      update: {
        organizationId: "org-1",
        credentialReference: "secret-ref",
        status: "ACTIVE",
      },
    });
    expect(database.whatsAppNumber.upsert).toHaveBeenCalledWith({
      where: { externalNumberId: "number-1" },
      create: {
        organizationId: "org-1",
        accountId: "account-db-1",
        externalNumberId: "number-1",
        displayNumber: "+55 11 99999-0000",
      },
      update: {
        organizationId: "org-1",
        accountId: "account-db-1",
        displayNumber: "+55 11 99999-0000",
        status: "ACTIVE",
      },
    });
  });
});
