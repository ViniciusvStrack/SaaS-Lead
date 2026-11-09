import { describe, expect, it, vi } from "vitest";

import { MetaSendProvider, type SendDatabaseLike } from "../src/processors/meta-send.provider.js";

interface SendProviderDatabase {
  whatsAppNumber: {
    findFirst: () => Promise<{ id: string; organizationId: string; accountId: string } | null>;
  };
  whatsAppAccount: {
    findUnique: () => Promise<{ id: string; credentialReference: string } | null>;
  };
}

const database: SendProviderDatabase = {
  whatsAppNumber: {
    findFirst: vi.fn(async () => ({
      id: "number-1",
      organizationId: "org-a",
      accountId: "account-1",
    })),
  },
  whatsAppAccount: {
    findUnique: vi.fn(async () => ({
      id: "account-1",
      credentialReference: "meta-server-token",
    })),
  },
};

describe("MetaSendProvider", () => {
  it("envia via Meta Cloud API e retorna o messageId", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid-1" }] }), { status: 200 }),
    );
    const provider = new MetaSendProvider(database as unknown as SendDatabaseLike, "v25.0", "fallback-token", fetcher);

    const result = await provider.send({
      phoneNumberId: "5511999999999",
      to: "5511888888888",
      payload: { type: "text", text: { body: "Olá" } },
      idempotencyKey: "idem-1",
    });

    expect(result.messageId).toBe("wamid-1");
    expect(fetcher).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/5511999999999/messages",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer meta-server-token" }),
      }),
    );
  });

  it("falha fechado quando a versão do Graph não está validada", () => {
    expect(() => new MetaSendProvider(database as unknown as SendDatabaseLike, "SET_AFTER_META_DASHBOARD_VALIDATION", "token")).toThrow("pinned");
  });

  it("usa o token de fallback quando a conta não tem credentialReference", async () => {
    database.whatsAppAccount.findUnique = vi.fn(async () => null);
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid-2" }] }), { status: 200 }),
    );
    const provider = new MetaSendProvider(database as unknown as SendDatabaseLike, "v25.0", "fallback-token", fetcher);

    await provider.send({
      phoneNumberId: "5511999999999",
      to: "5511888888888",
      payload: { type: "text", text: { body: "Olá" } },
      idempotencyKey: "idem-2",
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/messages"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer fallback-token" }),
      }),
    );
  });
});
