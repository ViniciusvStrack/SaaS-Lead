import type { ConversationSnapshot, InboundMessageEvent, OrganizationId, WebhookEventId } from "@saas-lead/contracts";

import type { NormalizeWebhookJob } from "../queues/webhook-normalize.queue.js";

export interface StoredInboundWebhook {
  id: string;
  organizationId: string;
  phoneNumberId: string;
  senderId: string;
  senderName?: string;
  messageId: string;
  body: string;
  occurredAt: Date;
}

export interface ConversationStore {
  loadWebhookForTenant(webhookEventId: string, organizationId: string): Promise<StoredInboundWebhook | undefined>;
  applyInboundAtomically(event: InboundMessageEvent): Promise<ConversationSnapshot>;
}

export class NormalizeInboundProcessor {
  constructor(private readonly store: ConversationStore) {}

  async process(job: NormalizeWebhookJob): Promise<ConversationSnapshot> {
    const webhook = await this.store.loadWebhookForTenant(job.webhookEventId, job.organizationId);
    if (!webhook) throw new Error("Webhook event not found");

    return this.store.applyInboundAtomically({
      webhookEventId: webhook.id as WebhookEventId,
      organizationId: webhook.organizationId as OrganizationId,
      phoneNumberId: webhook.phoneNumberId,
      externalMessageId: webhook.messageId,
      externalContactId: webhook.senderId,
      ...(webhook.senderName ? { contactName: webhook.senderName } : {}),
      body: webhook.body,
      occurredAt: webhook.occurredAt,
    });
  }
}
