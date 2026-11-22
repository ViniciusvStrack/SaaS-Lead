import { describe, expect, it } from "vitest";
import type { DatabaseClient } from "@saas-lead/database";
import { PrismaSubscriptionStore } from "../../src/modules/subscriptions/prisma-subscription.store.js";

interface DatabaseMock {
  billingEvent: {
    findUnique: (args: { where: { provider: string; externalEventId: string } }) => Promise<{ id: string } | null>;
    upsert: (args: {
      where: { provider: string; externalEventId: string };
      create: { provider: string; externalEventId: string; eventCreatedAt: Date; status: string; payloadRef: string };
      update: Record<string, never>;
    }) => Promise<{ id: string; externalEventId: string }>;
  };
  subscription: {
    updateMany: (args: { where: { organizationId: string; provider: string; externalSubscriptionId: string }; data: { status: string; lastEventAt: Date } }) => Promise<{ count: number }>;
  };
}

function makeDatabase(overrides: Partial<DatabaseMock> = {}) {
  const createdEvents: Array<{ provider: string; externalEventId: string }> = [];
  const db: DatabaseMock = {
    billingEvent: {
      findUnique: overrides.billingEvent?.findUnique
        ?? (async (args) => {
          const where = args.where as { provider_externalEventId?: { provider: string; externalEventId: string } };
          const found = createdEvents.find(
            (e) => e.provider === where.provider_externalEventId?.provider && e.externalEventId === where.provider_externalEventId?.externalEventId,
          );
          return found ? { id: found.externalEventId } : null;
        }),
      upsert: overrides.billingEvent?.upsert
        ?? (async (args) => {
          const where = args.where as { provider_externalEventId?: { provider: string; externalEventId: string } };
          const existing = createdEvents.find(
            (e) => e.provider === where.provider_externalEventId?.provider && e.externalEventId === where.provider_externalEventId?.externalEventId,
          );
          if (existing) return { id: existing.externalEventId, externalEventId: existing.externalEventId };
          createdEvents.push({ provider: where.provider_externalEventId!.provider, externalEventId: where.provider_externalEventId!.externalEventId });
          return { id: where.provider_externalEventId!.externalEventId, externalEventId: where.provider_externalEventId!.externalEventId };
        }),
    },
    subscription: {
      updateMany: overrides.subscription?.updateMany
        ?? (async () => ({ count: 1 })),
    },
  };
  return { db, createdEvents };
}

describe("BillingEvent dedup", () => {
  it("cria evento quando externalEventId é novo", async () => {
    const { db } = makeDatabase();
    const store = new PrismaSubscriptionStore(db as unknown as DatabaseClient);

    const result = await store.recordEvent({
      externalEventId: "evt-1",
      externalSubscriptionId: "sub-1",
      eventCreatedAt: new Date("2026-11-17T10:00:00Z"),
      payload: { status: "approved" },
      status: "ACTIVE",
      organizationId: "org-1",
    });

    expect(result.duplicate).toBe(false);
  });

  it("não cria duplicata quando externalEventId já existe", async () => {
    const { db } = makeDatabase();
    const store = new PrismaSubscriptionStore(db as unknown as DatabaseClient);

    await store.recordEvent({
      externalEventId: "evt-1",
      externalSubscriptionId: "sub-1",
      eventCreatedAt: new Date("2026-11-17T10:00:00Z"),
      payload: { status: "approved" },
      status: "ACTIVE",
      organizationId: "org-1",
    });
    const result = await store.recordEvent({
      externalEventId: "evt-1",
      externalSubscriptionId: "sub-1",
      eventCreatedAt: new Date("2026-11-17T10:05:00Z"),
      payload: { status: "approved" },
      status: "ACTIVE",
      organizationId: "org-1",
    });

    expect(result.duplicate).toBe(true);
  });

  it("cria eventos distintos para externalEventId diferentes", async () => {
    const { db, createdEvents } = makeDatabase();
    const store = new PrismaSubscriptionStore(db as unknown as DatabaseClient);

    await store.recordEvent({
      externalEventId: "evt-1",
      externalSubscriptionId: "sub-1",
      eventCreatedAt: new Date("2026-11-17T10:00:00Z"),
      payload: { status: "approved" },
      status: "ACTIVE",
      organizationId: "org-1",
    });
    await store.recordEvent({
      externalEventId: "evt-2",
      externalSubscriptionId: "sub-1",
      eventCreatedAt: new Date("2026-11-17T10:01:00Z"),
      payload: { status: "approved" },
      status: "ACTIVE",
      organizationId: "org-1",
    });

    expect(createdEvents).toHaveLength(2);
  });
});
