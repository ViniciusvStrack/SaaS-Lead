import type { OrganizationId, WebhookEventId } from "../common/ids.js";

export interface InboundMessageEvent {
  webhookEventId: WebhookEventId;
  organizationId: OrganizationId;
  phoneNumberId: string;
  externalMessageId: string;
  externalContactId: string;
  contactName?: string;
  body: string;
  occurredAt: Date;
}

export interface ConversationSnapshot {
  conversationId: string;
  organizationId: OrganizationId;
  contactId: string;
  lastMessageBody: string;
  lastMessageAt: Date;
}
