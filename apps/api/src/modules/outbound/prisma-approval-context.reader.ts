import type { DatabaseClient, TenantContext } from "@saas-lead/database";
import type { ApprovalContext } from "./approval-context.js";
import type { ApproveOutboundInput } from "./outbound-approval.service.js";
import { deriveApprovalContext, readCooldownSeconds } from "./approval-context.js";

/**
 * Lê o contexto de aprovação exclusivamente do banco de dados.
 * O cliente nunca envia esses dados; qualquer valor ausente faz a
 * Política falhar fechado (CONTEXT_UNKNOWN).
 */
export class PrismaApprovalContextReader {
  constructor(private readonly database: DatabaseClient) {}

  async read(tenant: TenantContext, input: ApproveOutboundInput): Promise<ApprovalContext> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: input.conversationId, organizationId: tenant.organizationId },
      include: {
        contact: { include: { consentRecords: { orderBy: { capturedAt: "desc" }, take: 1 } } },
        messages: {
          where: { direction: "INBOUND" },
          orderBy: { occurredAt: "desc" },
          take: 1,
        },
      },
    });
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

    const lastConsent = conversation.contact.consentRecords?.[0];
    const lastInbound = conversation.messages?.[0]?.occurredAt ?? null;

    const account = await this.database.whatsAppAccount.findFirst({
      where: { organizationId: tenant.organizationId, status: "ACTIVE" },
    });

    let templateStatus: { status: string } | null = null;
    if (input.templateId) {
      const template = await this.database.messageTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (template) templateStatus = { status: template.status };
    }

    const lastOutbound = await this.database.outboundMessage.findFirst({
      where: { organizationId: tenant.organizationId, conversationId: input.conversationId },
      orderBy: { sentAt: "desc" },
      take: 1,
    });

    const settings = await this.database.businessSettings.findUnique({
      where: { organizationId: tenant.organizationId },
    });

    return deriveApprovalContext({
      consent: lastConsent
        ? { status: lastConsent.status, capturedAt: lastConsent.capturedAt }
        : null,
      lastInboundAt: lastInbound,
      template: templateStatus,
      accountActive: !!account,
      actorCanApprove: ["OWNER", "ADMIN", "AGENT"].includes(tenant.role),
      lastOutboundAt: lastOutbound?.sentAt ?? null,
      cooldownSeconds: readCooldownSeconds(settings?.commercialPolicies),
      now: new Date(),
    });
  }
}
