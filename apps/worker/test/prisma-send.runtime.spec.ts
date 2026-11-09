import { describe, expect, it } from "vitest";

import { PolicyEngine } from "@saas-lead/policy";
import { PrismaSendRuntime } from "../src/processors/prisma-send.runtime.js";
import { sha256 } from "../src/processors/approval-context.js";

const orgId = "org-a";
const messageId = "out-1";
const conversationId = "conv-1";
const contactId = "contact-1";
const numberId = "number-1";
const accountId = "account-1";
const now = new Date("2026-11-09T12:00:00.000Z");

type OutboundMessageRow = {
  id: string;
  organizationId: string;
  conversationId: string;
  status: string;
  content: string;
  contentHash: string;
  idempotencyKey: string;
  templateId: string | null;
  conversation: {
    id: string;
    organizationId: string;
    contact: {
      id: string;
      externalContactId: string;
      consentRecords: Array<{ id: string; status: string; capturedAt: Date }>;
    };
    number: { id: string; externalNumberId: string };
    messages: Array<{ id: string; direction: string; occurredAt: Date }>;
  };
};

type UpdateArgs = { data: Record<string, unknown>; where: Record<string, unknown> };
type CreateEventArgs = { data: Record<string, unknown> };

function makeDatabase(overrides: {
  outboundMessage?: Partial<{
    findFirst: () => Promise<OutboundMessageRow | null>;
    updateMany: () => Promise<{ count: number }>;
    update: (args: UpdateArgs) => Promise<Record<string, unknown>>;
  }>;
  outboundMessageEvent?: Partial<{
    create: (args: CreateEventArgs) => Promise<unknown>;
  }>;
  whatsAppAccount?: Partial<{
    findFirst: () => Promise<{ id: string; credentialReference: string } | null>;
  }>;
  messageTemplate?: Partial<{
    findUnique: () => Promise<{ id: string; status: string } | null>;
  }>;
  businessSettings?: Partial<{
    findUnique: () => Promise<{ commercialPolicies: unknown } | null>;
  }>;
} = {}) {
  const updates: UpdateArgs[] = [];
  const events: CreateEventArgs[] = [];
  const db = {
    outboundMessage: {
      findFirst: overrides.outboundMessage?.findFirst ?? (async () => ({
        id: messageId,
        organizationId: orgId,
        conversationId,
        status: "APPROVED",
        content: "Olá",
        contentHash: sha256("Olá"),
        idempotencyKey: "key-1",
        templateId: null,
        conversation: {
          id: conversationId,
          organizationId: orgId,
          contact: {
            id: contactId,
            externalContactId: "5511999999999",
            consentRecords: [{ id: "c-1", status: "GRANTED", capturedAt: now }],
          },
          number: {
            id: numberId,
            externalNumberId: "5511999999999",
          },
          messages: [{ id: "m-1", direction: "INBOUND", occurredAt: now }],
        },
      }) satisfies OutboundMessageRow),
      updateMany: overrides.outboundMessage?.updateMany ?? (async () => ({ count: 1 })),
      update: overrides.outboundMessage?.update ?? (async (args: UpdateArgs) => {
        updates.push(args);
        return args.data;
      }),
    },
    outboundMessageEvent: {
      create: overrides.outboundMessageEvent?.create ?? (async (args: CreateEventArgs) => {
        events.push(args);
      }),
    },
    whatsAppAccount: {
      findFirst: overrides.whatsAppAccount?.findFirst ?? (async () => ({ id: accountId, credentialReference: "token" })),
    },
    messageTemplate: {
      findUnique: overrides.messageTemplate?.findUnique ?? (async () => null),
    },
    businessSettings: {
      findUnique: overrides.businessSettings?.findUnique ?? (async () => null),
    },
  };
  return { db, updates, events };
}

describe("PrismaSendRuntime", () => {
  it("envia mensagem aprovada e marca SENT", async () => {
    const { db, updates, events } = makeDatabase();
    const provider = { send: async () => ({ messageId: "meta-1" }) };
    const runtime = new PrismaSendRuntime(db as unknown as ConstructorParameters<typeof PrismaSendRuntime>[0], provider, new PolicyEngine(), () => now);

    const result = await runtime.process({ organizationId: orgId, outboundMessageId: messageId });

    expect(result.status).toBe("SENT");
    const sentUpdate = updates.find((u) => u.data.status === "SENT");
    expect(sentUpdate?.data.externalMessageId).toBe("meta-1");
    expect(sentUpdate?.data.sentAt).toBeDefined();
    expect(events.find((e) => e.data.status === "SENT")).toBeDefined();
  });

  it("não envia conteúdo alterado depois da aprovação", async () => {
    const { db, updates } = makeDatabase({
      outboundMessage: {
        findFirst: async () => ({
          id: messageId,
          organizationId: orgId,
          conversationId,
          status: "APPROVED",
          content: "conteúdo alterado",
          contentHash: sha256("conteúdo original aprovado"),
          idempotencyKey: "key-1",
          templateId: null,
          conversation: {
            id: conversationId,
            organizationId: orgId,
            contact: {
              id: contactId,
              externalContactId: "5511999999999",
              consentRecords: [{ id: "c-1", status: "GRANTED", capturedAt: now }],
            },
            number: { id: numberId, externalNumberId: "5511999999999" },
            messages: [{ id: "m-1", direction: "INBOUND", occurredAt: now }],
          },
        }) satisfies OutboundMessageRow,
        updateMany: async () => ({ count: 1 }),
        update: async (args: UpdateArgs) => {
          updates.push(args);
          return args.data;
        },
      },
    });
    const provider = { send: async () => ({ messageId: "meta-1" }) };
    const runtime = new PrismaSendRuntime(db as unknown as ConstructorParameters<typeof PrismaSendRuntime>[0], provider, new PolicyEngine(), () => now);

    const result = await runtime.process({ organizationId: orgId, outboundMessageId: messageId });

    expect(result.status).toBe("BLOCKED");
    expect(updates.find((u) => u.data.status === "BLOCKED")).toBeDefined();
    expect(updates.find((u) => u.data.status === "SENT")).toBeUndefined();
  });

  it("falha do provider volta para APPROVED e propaga o erro", async () => {
    const { db, updates } = makeDatabase();
    const provider = { send: async () => { throw new Error("timeout"); } };
    const runtime = new PrismaSendRuntime(db as unknown as ConstructorParameters<typeof PrismaSendRuntime>[0], provider, new PolicyEngine(), () => now);

    await expect(runtime.process({ organizationId: orgId, outboundMessageId: messageId })).rejects.toThrow("timeout");
    expect(updates.find((u) => u.data.status === "APPROVED")).toBeDefined();
  });

  it("mensagem já SENDING não é reenviada", async () => {
    const { db } = makeDatabase({
      outboundMessage: {
        findFirst: async () => ({
          id: messageId,
          organizationId: orgId,
          conversationId,
          status: "APPROVED",
          content: "Olá",
          contentHash: sha256("Olá"),
          idempotencyKey: "key-1",
          templateId: null,
          conversation: {
            id: conversationId,
            organizationId: orgId,
            contact: {
              id: contactId,
              externalContactId: "5511999999999",
              consentRecords: [{ id: "c-1", status: "GRANTED", capturedAt: now }],
            },
            number: { id: numberId, externalNumberId: "5511999999999" },
            messages: [{ id: "m-1", direction: "INBOUND", occurredAt: now }],
          },
        }) satisfies OutboundMessageRow,
        updateMany: async () => ({ count: 0 }),
      },
    });
    const provider = { send: async () => ({ messageId: "meta-1" }) };
    const runtime = new PrismaSendRuntime(db as unknown as ConstructorParameters<typeof PrismaSendRuntime>[0], provider, new PolicyEngine(), () => now);

    const result = await runtime.process({ organizationId: orgId, outboundMessageId: messageId });

    expect(result.status).toBe("APPROVED");
  });
});
