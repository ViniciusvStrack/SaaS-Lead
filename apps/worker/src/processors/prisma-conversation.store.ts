import type { DatabaseClient } from "@saas-lead/database";
import type { ConversationSnapshot, InboundMessageEvent, OrganizationId } from "@saas-lead/contracts";
import type { ConversationStore, StoredInboundWebhook } from "./normalize-inbound.processor.js";

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: { voice?: boolean };
  sticker?: { emoji?: string };
  location?: { name?: string; address?: string };
  contacts?: Array<{ name?: { formatted_name?: string } }>;
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  reaction?: { emoji?: string };
};

type MetaPayload = {
  entry?: Array<{ changes?: Array<{ value?: {
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
    messages?: MetaMessage[];
  } }> }>;
};

export class PrismaConversationStore implements ConversationStore {
  constructor(private readonly database: DatabaseClient) {}

  async loadWebhookForTenant(webhookEventId: string, organizationId: string): Promise<StoredInboundWebhook | undefined> {
    const webhook = await this.database.webhookEvent.findFirst({ where: { id: webhookEventId, organizationId } });
    if (!webhook) return undefined;
    const parsed = parseInboundPayload(webhook.payload);
    if (!parsed) throw new Error("Unsupported inbound webhook payload");
    await this.database.webhookEvent.update({ where: { id: webhook.id }, data: { attempts: { increment: 1 } } });
    return { id: webhook.id, organizationId: webhook.organizationId, phoneNumberId: webhook.numberId, senderId: parsed.senderId, ...(parsed.senderName ? { senderName: parsed.senderName } : {}), messageId: parsed.messageId, body: parsed.body, occurredAt: parsed.occurredAt };
  }

  async applyInboundAtomically(event: InboundMessageEvent): Promise<ConversationSnapshot> {
    return this.database.$transaction(async (transaction) => {
      const duplicate = await transaction.message.findUnique({ where: { organizationId_externalMessageId: { organizationId: event.organizationId, externalMessageId: event.externalMessageId } } });
      if (duplicate) {
        await transaction.webhookEvent.update({ where: { id: event.webhookEventId }, data: { status: "PROCESSED", processedAt: new Date() } });
        const existing = await transaction.conversation.findUniqueOrThrow({ where: { id: duplicate.conversationId } });
        return toSnapshot(existing);
      }

      const contact = await transaction.contact.upsert({
        where: { organizationId_externalContactId: { organizationId: event.organizationId, externalContactId: event.externalContactId } },
        create: { organizationId: event.organizationId, externalContactId: event.externalContactId, ...(event.contactName ? { displayName: event.contactName } : {}) },
        update: event.contactName ? { displayName: event.contactName } : {},
      });
      let conversation = await transaction.conversation.upsert({
        where: { organizationId_numberId_contactId: { organizationId: event.organizationId, numberId: event.phoneNumberId, contactId: contact.id } },
        create: { organizationId: event.organizationId, numberId: event.phoneNumberId, contactId: contact.id, lastMessageBody: event.body, lastMessageAt: event.occurredAt },
        update: {},
      });
      await transaction.message.create({ data: { organizationId: event.organizationId, conversationId: conversation.id, webhookEventId: event.webhookEventId, externalMessageId: event.externalMessageId, direction: "INBOUND", body: event.body, occurredAt: event.occurredAt } });
      if (!conversation.lastMessageAt || event.occurredAt >= conversation.lastMessageAt) {
        conversation = await transaction.conversation.update({ where: { id: conversation.id }, data: { lastMessageBody: event.body, lastMessageAt: event.occurredAt } });
      }
      await transaction.webhookEvent.update({ where: { id: event.webhookEventId }, data: { status: "PROCESSED", processedAt: new Date() } });
      return toSnapshot(conversation);
    }, { isolationLevel: "Serializable" });
  }
}

export function parseInboundPayload(payload: unknown) {
  const value = (payload as MetaPayload)?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];
  const senderId = message?.from ?? contact?.wa_id;
  const body = message ? bodyFromMessage(message) : undefined;
  const timestamp = Number(message?.timestamp);
  if (!message?.id || !senderId || !body || !Number.isFinite(timestamp)) return undefined;
  return { messageId: message.id, senderId, senderName: contact?.profile?.name, body, occurredAt: new Date(timestamp * 1000) };
}

/**
 * WhatsApp delivers text, media, buttons, reactions and more. The analysis
 * pipeline only needs a readable body, so non-text messages become a short
 * placeholder (plus caption/filename when available) instead of failing.
 */
function bodyFromMessage(message: MetaMessage): string | undefined {
  const label = (name: string, detail?: string) => {
    const trimmed = detail?.trim();
    return trimmed ? `[${name}] ${trimmed}` : `[${name}]`;
  };
  switch (message.type) {
    case "text":
      return message.text?.body;
    case "image":
      return label("imagem", message.image?.caption);
    case "video":
      return label("vídeo", message.video?.caption);
    case "document":
      return label("documento", message.document?.caption ?? message.document?.filename);
    case "audio":
      return "[áudio]";
    case "sticker":
      return "[figurinha]";
    case "location":
      return label("localização", message.location?.name ?? message.location?.address);
    case "contacts":
      return label("contato", message.contacts?.[0]?.name?.formatted_name);
    case "button":
      return label("botão", message.button?.text);
    case "interactive":
      return label("resposta", message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title);
    case "reaction":
      return label("reação", message.reaction?.emoji);
    default:
      return label(message.type ?? "mensagem");
  }
}

function toSnapshot(conversation: { id: string; organizationId: string; contactId: string; lastMessageBody: string | null; lastMessageAt: Date | null }): ConversationSnapshot {
  if (!conversation.lastMessageBody || !conversation.lastMessageAt) throw new Error("Conversation snapshot is incomplete");
  return { conversationId: conversation.id, organizationId: conversation.organizationId as OrganizationId, contactId: conversation.contactId, lastMessageBody: conversation.lastMessageBody, lastMessageAt: conversation.lastMessageAt };
}
