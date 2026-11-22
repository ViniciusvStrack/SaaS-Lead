import type { DatabaseClient } from "@saas-lead/database";
import type { SubscriptionStatus } from "@saas-lead/contracts";

export class PrismaSubscriptionStore {
  constructor(private readonly database: DatabaseClient) {}

  async findByIdempotency(organizationId: string, key: string) {
    return this.database.subscription.findUnique({ where: { organizationId_creationIdempotencyKey: { organizationId, creationIdempotencyKey: key } } });
  }

  async findByOrganization(organizationId: string) {
    return this.database.subscription.findFirst({ where: { organizationId, provider: "mercadopago" }, include: { plan: true }, orderBy: { createdAt: "desc" } });
  }

  async create(input: { organizationId: string; planCode: string; idempotencyKey: string; payerEmail: string; externalSubscriptionId: string; checkoutUrl?: string }) {
    const plan = await this.database.plan.findUnique({ where: { code: input.planCode } });
    if (!plan) throw new Error(`Plan not found: ${input.planCode}`);
    return this.database.subscription.create({
      data: {
        organizationId: input.organizationId,
        planId: plan.id,
        provider: "mercadopago",
        externalCustomerId: input.payerEmail,
        externalSubscriptionId: input.externalSubscriptionId,
        creationIdempotencyKey: input.idempotencyKey,
        status: "INCOMPLETE",
      },
    });
  }

  async recordEvent(input: { externalEventId: string; externalSubscriptionId: string; eventCreatedAt: Date; payload: unknown; status: SubscriptionStatus; organizationId: string }) {
    const where = { provider_externalEventId: { provider: "mercadopago", externalEventId: input.externalEventId } };

    // Fast-path de leitura: evento já processado? Retorna duplicata sem gravar nada.
    const existing = await this.database.billingEvent.findUnique({ where });
    if (existing) return { duplicate: true } as const;

    // Upsert atômico sobre a unique constraint @@unique([provider, externalEventId]).
    // Garante um único BillingEvent mesmo sob concorrência, sem erro de unique constraint:
    // se outro processo criou entre o findUnique e aqui, o upsert não cria nem falha.
    await this.database.billingEvent.upsert({
      where,
      create: {
        provider: "mercadopago",
        externalEventId: input.externalEventId,
        eventCreatedAt: input.eventCreatedAt,
        status: "PROCESSED",
        processedAt: new Date(),
        payloadRef: JSON.stringify(input.payload),
      },
      update: {}, // idempotente: não altera evento já existente
    });

    await this.database.subscription.updateMany({
      where: { organizationId: input.organizationId, provider: "mercadopago", externalSubscriptionId: input.externalSubscriptionId },
      data: { status: input.status, lastEventAt: input.eventCreatedAt },
    });

    return { duplicate: false } as const;
  }
}
