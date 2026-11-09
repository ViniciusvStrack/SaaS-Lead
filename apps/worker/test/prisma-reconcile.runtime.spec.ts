import { describe, expect, it } from "vitest";

import { PrismaReconcileRuntime } from "../src/processors/prisma-reconcile.runtime.js";

const orgId = "org-a";
const otherOrgId = "org-b";
const externalMessageId = "meta-msg-1";
const externalEventId = "evt-status-1";
const messageId = "out-1";
const now = new Date("2026-11-09T12:00:00.000Z");

type OutboundMessageRow = {
  id: string;
  organizationId: string;
  status: string;
  externalMessageId: string | null;
};

type FindFirstArgs = { where: Record<string, unknown> };
type UpdateManyArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type CreateEventArgs = { data: Record<string, unknown> };

function makeDatabase(overrides: {
  outboundMessage?: Partial<{
    findFirst: (args: FindFirstArgs) => Promise<OutboundMessageRow | null>;
    updateMany: (args: UpdateManyArgs) => Promise<{ count: number }>;
  }>;
  outboundMessageEvent?: Partial<{
    create: (args: CreateEventArgs) => Promise<unknown>;
  }>;
} = {}) {
  const updates: UpdateManyArgs[] = [];
  const events: CreateEventArgs[] = [];

  const db = {
    outboundMessage: {
      findFirst: overrides.outboundMessage?.findFirst ?? (async (args: FindFirstArgs) => {
        const where = args.where;
        if (where.organizationId === orgId && where.externalMessageId === externalMessageId) {
          return {
            id: messageId,
            organizationId: orgId,
            status: "SENT",
            externalMessageId,
          } satisfies OutboundMessageRow;
        }
        return null;
      }),
      updateMany: overrides.outboundMessage?.updateMany ?? (async (args: UpdateManyArgs) => {
        updates.push(args);
        return { count: 1 };
      }),
    },
    outboundMessageEvent: {
      create: overrides.outboundMessageEvent?.create ?? (async (args: CreateEventArgs) => {
        events.push(args);
      }),
    },
  };
  return { db, updates, events };
}

describe("PrismaReconcileRuntime", () => {
  it("transição SENT → DELIVERED com updateMany atômico e criação de OutboundMessageEvent", async () => {
    const { db, updates, events } = makeDatabase();
    const runtime = new PrismaReconcileRuntime(
      db as unknown as ConstructorParameters<typeof PrismaReconcileRuntime>[0],
      () => now,
    );

    const result = await runtime.process({
      organizationId: orgId,
      externalMessageId,
      externalEventId,
      status: "DELIVERED",
    });

    expect(result.status).toBe("DELIVERED");
    expect(updates).toHaveLength(1);
    const update = updates[0]!;
    expect(update.where).toMatchObject({
      id: messageId,
      organizationId: orgId,
      status: {
        in: expect.arrayContaining(["APPROVED", "BLOCKED", "SENT", "READ", "FAILED"]),
      },
    });
    expect(update.where.status).not.toContain("DELIVERED");
    expect(update.data).toMatchObject({ status: "DELIVERED" });
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.data).toMatchObject({
      organizationId: orgId,
      outboundMessageId: messageId,
      externalEventId,
      status: "DELIVERED",
    });
  });

  it("idempotência: mesmo externalEventId processado duas vezes cria apenas um evento (P2002 ignorado)", async () => {
    let createCalls = 0;
    const { db, events } = makeDatabase({
      outboundMessageEvent: {
        create: async (args: CreateEventArgs) => {
          createCalls += 1;
          if (createCalls === 2) {
            throw { code: "P2002", meta: { target: ["externalEventId"] } };
          }
          events.push(args);
        },
      },
    });
    const runtime = new PrismaReconcileRuntime(
      db as unknown as ConstructorParameters<typeof PrismaReconcileRuntime>[0],
      () => now,
    );

    const r1 = await runtime.process({
      organizationId: orgId,
      externalMessageId,
      externalEventId,
      status: "DELIVERED",
    });
    const r2 = await runtime.process({
      organizationId: orgId,
      externalMessageId,
      externalEventId,
      status: "DELIVERED",
    });

    expect(r1.status).toBe("DELIVERED");
    expect(r2.status).toBe("DELIVERED");
    expect(createCalls).toBe(2);
    expect(events).toHaveLength(1);
  });

  it("mensagem não encontrada (externalMessageId desconhecido) não quebra o worker", async () => {
    const { db, updates, events } = makeDatabase({
      outboundMessage: {
        findFirst: async () => null,
      },
    });
    const runtime = new PrismaReconcileRuntime(
      db as unknown as ConstructorParameters<typeof PrismaReconcileRuntime>[0],
      () => now,
    );

    const result = await runtime.process({
      organizationId: orgId,
      externalMessageId: "desconhecido",
      externalEventId,
      status: "DELIVERED",
    });

    expect(result.status).toBe("FAILED");
    expect(updates).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("tenant isolation: organização diferente não encontra a mensagem", async () => {
    const { db, updates, events } = makeDatabase();
    const runtime = new PrismaReconcileRuntime(
      db as unknown as ConstructorParameters<typeof PrismaReconcileRuntime>[0],
      () => now,
    );

    const result = await runtime.process({
      organizationId: otherOrgId,
      externalMessageId,
      externalEventId,
      status: "DELIVERED",
    });

    expect(result.status).toBe("FAILED");
    expect(updates).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("transição inválida (status já é o mesmo) não cria evento duplicado", async () => {
    const { db, updates, events } = makeDatabase({
      outboundMessage: {
        findFirst: async () => ({
          id: messageId,
          organizationId: orgId,
          status: "SENT",
          externalMessageId,
        }) satisfies OutboundMessageRow,
        updateMany: async (args: UpdateManyArgs) => {
          updates.push(args);
          return { count: 0 };
        },
      },
      outboundMessageEvent: {
        create: async () => {
          throw new Error("não deveria criar evento");
        },
      },
    });
    const runtime = new PrismaReconcileRuntime(
      db as unknown as ConstructorParameters<typeof PrismaReconcileRuntime>[0],
      () => now,
    );

    const result = await runtime.process({
      organizationId: orgId,
      externalMessageId,
      externalEventId,
      status: "SENT",
    });

    expect(result.status).toBe("SENT");
    expect(updates).toHaveLength(1);
    const update = updates[0]!;
    expect(update.where).toMatchObject({
      id: messageId,
      organizationId: orgId,
      status: {
        in: expect.not.arrayContaining(["SENT"]),
      },
    });
    expect(events).toHaveLength(0);
  });
});
