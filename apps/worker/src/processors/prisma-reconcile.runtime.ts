import type { DatabaseClient } from "@saas-lead/database";

import type { OutboundStatus } from "./send-message.processor.js";

/**
 * Statuses possíveis de OutboundMessage, definidos em send-message.processor.ts.
 */
const ALL_STATUSES: OutboundStatus[] = [
  "APPROVED",
  "BLOCKED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
];

type PrismaKnownError = { code: string; meta?: unknown };

function isUniqueViolation(error: unknown): error is PrismaKnownError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as PrismaKnownError).code === "P2002"
  );
}

/**
 * Runtime de reconciliação de status de outbound no worker.
 *
 * Fluxo por job message.reconcile:
 * 1. Carrega o OutboundMessage por externalMessageId + organizationId (tenant isolation).
 * 2. Não encontrado → retorna { status: "FAILED" } silenciosamente (não quebra o worker).
 * 3. updateMany atômico: só avança se o status atual for diferente do novo
 *    (status in todos os exceto o novo) — evita reprocessar / retroceder.
 * 4. count === 0 → já processado ou transição inválida, retorna status atual sem criar evento.
 * 5. Cria OutboundMessageEvent com externalEventId; unique violation (P2002) é ignorada
 *    (idempotência: cada externalEventId é aceito apenas uma vez).
 * 6. Retorna { status: newStatus }.
 */
export class PrismaReconcileRuntime {
  constructor(
    private readonly database: DatabaseClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async process(job: {
    organizationId: string;
    externalMessageId: string;
    externalEventId: string;
    status: OutboundStatus;
  }): Promise<{ status: OutboundStatus }> {
    // 1. Buscar OutboundMessage por externalMessageId + organizationId (tenant isolation).
    const message = await this.database.outboundMessage.findFirst({
      where: { organizationId: job.organizationId, externalMessageId: job.externalMessageId },
    });

    // 2. Não encontrado → falha silenciosa.
    if (!message) return { status: "FAILED" };

    const newStatus = job.status;

    // 3. updateMany atômico: permite qualquer transição se o status atual for diferente do novo.
    const priorStatuses = ALL_STATUSES.filter((s) => s !== newStatus);
    const updated = await this.database.outboundMessage.updateMany({
      where: {
        id: message.id,
        organizationId: job.organizationId,
        status: { in: priorStatuses },
      },
      data: { status: newStatus },
    });

    // 4. count === 0 → já processado ou transição inválida, retorna status atual sem evento.
    if (updated.count === 0) return { status: message.status as OutboundStatus };

    // 5. Criar OutboundMessageEvent; P2002 (unique violation por externalEventId) é ignorado.
    try {
      await this.database.outboundMessageEvent.create({
        data: {
          organizationId: job.organizationId,
          outboundMessageId: message.id,
          externalEventId: job.externalEventId,
          status: newStatus,
          occurredAt: this.now(),
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }

    // 6. Retorna o novo status.
    return { status: newStatus };
  }
}
