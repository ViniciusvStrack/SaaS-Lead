import type { DatabaseClient } from "@saas-lead/database";
import { PolicyEngine } from "@saas-lead/policy";

import type { OutboundStatus, SendProvider } from "./send-message.processor.js";
import {
  deriveApprovalContext,
  sha256,
  readCooldownSeconds,
} from "./approval-context.js";

/**
 * Runtime de envio outbound no worker.
 *
 * Fluxo por job message.send:
 * 1. Carrega o OutboundMessage do banco (somente APPROVED avança).
 * 2. Marca SENDING de forma atômica (somente se ainda for APPROVED -> evita envio duplo).
 * 3. Reavalia o Policy Engine com contexto do servidor (nunca confia no cliente).
 * 4. Se bloqueado -> marca BLOCKED e encerra.
 * 5. Se aprovado -> chama o provider Meta; sucesso -> SENT + externalMessageId + sentAt.
 * 6. Falha/timeout -> volta para APPROVED e propaga o erro (BullMQ retry).
 */
export class PrismaSendRuntime {
  constructor(
    private readonly database: DatabaseClient,
    private readonly provider: SendProvider,
    private readonly policy: PolicyEngine = new PolicyEngine(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async process(job: { organizationId: string; outboundMessageId: string }): Promise<{ status: OutboundStatus }> {
    const message = await this.database.outboundMessage.findFirst({
      where: { id: job.outboundMessageId, organizationId: job.organizationId },
      include: {
        conversation: {
          include: {
            contact: { include: { consentRecords: { orderBy: { capturedAt: "desc" }, take: 1 } } },
            number: true,
            messages: { where: { direction: "INBOUND" }, orderBy: { occurredAt: "desc" }, take: 1 },
          },
        },
      },
    });
    if (!message) return { status: "FAILED" };
    if (message.status !== "APPROVED") return { status: message.status as OutboundStatus };
    // "SENDING" não é um status final do OutboundStatus; trata como ainda pendente.

    // Transição atômica APPROVED -> SENDING: evita que dois workers enviem a mesma mensagem.
    const updated = await this.database.outboundMessage.updateMany({
      where: { id: job.outboundMessageId, status: "APPROVED" },
      data: { status: "SENDING" },
    });
    if (updated.count === 0) return { status: "APPROVED" };

    // Reavalia política com contexto do servidor (cliente não é confiável).
    const context = await this.readContext(message, job.organizationId);
    const contentHash = sha256(message.content); // hash do conteúdo atual
    const decision = this.policy.evaluate({
      ...context,
      contentHash,
      approvedContentHash: message.contentHash, // hash aprovado originalmente
      actorCanApprove: true,
    });
    if (decision.decision !== "APPROVED") {
      await this.database.outboundMessage.update({
        where: { id: job.outboundMessageId },
        data: { status: "BLOCKED" },
      });
      await this.database.outboundMessageEvent.create({
        data: {
          organizationId: job.organizationId,
          outboundMessageId: job.outboundMessageId,
          externalEventId: `policy-block-${job.outboundMessageId}`,
          status: "BLOCKED",
          payload: { reasons: decision.reasons },
        },
      });
      return { status: "BLOCKED" };
    }

    let messageId: string | undefined;
    try {
      const result = await this.provider.send({
        phoneNumberId: message.conversation.number.externalNumberId,
        to: message.conversation.contact.externalContactId,
        payload: { type: "text", text: { body: message.content } },
        idempotencyKey: message.idempotencyKey,
      });
      messageId = result.messageId;
    } catch (error) {
      await this.database.outboundMessage.update({
        where: { id: job.outboundMessageId },
        data: { status: "APPROVED" },
      });
      throw error;
    }

    await this.database.outboundMessage.update({
      where: { id: job.outboundMessageId },
      data: { status: "SENT", externalMessageId: messageId, sentAt: this.now() },
    });
    await this.database.outboundMessageEvent.create({
      data: {
        organizationId: job.organizationId,
        outboundMessageId: job.outboundMessageId,
        externalEventId: `msg-${messageId ?? job.outboundMessageId}`,
        status: "SENT",
        payload: { messageId },
      },
    });
    return { status: "SENT" };
  }

  private async readContext(message: { conversation: { contact: { externalContactId: string; consentRecords: Array<{ status: string; capturedAt: Date }> }; number: { externalNumberId: string }; messages: Array<{ occurredAt: Date }> }; templateId: string | null; conversationId: string; content: string; contentHash: string }, organizationId: string) {
    const conversation = message.conversation;
    const lastConsent = conversation.contact.consentRecords?.[0];
    const lastInbound = conversation.messages?.[0]?.occurredAt ?? null;

    const account = await this.database.whatsAppAccount.findFirst({
      where: { organizationId, status: "ACTIVE" },
    });

    let templateStatus: { status: string } | null = null;
    if (message.templateId) {
      const template = await this.database.messageTemplate.findUnique({ where: { id: message.templateId } });
      if (template) templateStatus = { status: template.status };
    }

    const lastOutbound = await this.database.outboundMessage.findFirst({
      where: { organizationId, conversationId: message.conversationId },
      orderBy: { sentAt: "desc" },
      take: 1,
    });

    const settings = await this.database.businessSettings.findUnique({ where: { organizationId } });

    return deriveApprovalContext({
      consent: lastConsent ? { status: lastConsent.status, capturedAt: lastConsent.capturedAt } : null,
      lastInboundAt: lastInbound,
      template: templateStatus,
      accountActive: !!account,
      lastOutboundAt: lastOutbound?.sentAt ?? null,
      cooldownSeconds: readCooldownSeconds(settings?.commercialPolicies),
      now: this.now(),
    });
  }
}
