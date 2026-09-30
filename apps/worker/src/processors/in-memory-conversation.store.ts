import type { ConversationSnapshot, InboundMessageEvent } from "@saas-lead/contracts";

import type { ConversationStore, StoredInboundWebhook } from "./normalize-inbound.processor.js";

export interface StoredWebhookEvent extends StoredInboundWebhook {
  externalId: string;
  status?: "PENDING" | "PROCESSED" | "FAILED";
  attempts?: number;
}

interface ContactRecord { id: string; organizationId: string; externalContactId: string; name?: string }
interface MessageRecord { id: string; organizationId: string; conversationId: string; externalMessageId: string; body: string; occurredAt: Date }
type CompleteWebhook = StoredWebhookEvent & { status: "PENDING" | "PROCESSED" | "FAILED"; attempts: number };

export class InMemoryConversationStore implements ConversationStore {
  readonly webhookEvents = new Map<string, CompleteWebhook>();
  contacts: ContactRecord[] = [];
  conversations: ConversationSnapshot[] = [];
  messages: MessageRecord[] = [];
  private locked: Promise<void> = Promise.resolve();
  private failAfterMessageOnce: boolean;

  constructor(events: StoredWebhookEvent[], options: { failAfterMessageOnce?: boolean } = {}) {
    this.failAfterMessageOnce = options.failAfterMessageOnce ?? false;
    for (const item of events) {
      this.webhookEvents.set(item.id, { ...item, status: item.status ?? "PENDING", attempts: item.attempts ?? 0 });
    }
  }

  async loadWebhookForTenant(webhookEventId: string, organizationId: string): Promise<StoredInboundWebhook | undefined> {
    const webhook = this.webhookEvents.get(webhookEventId);
    if (!webhook || webhook.organizationId !== organizationId) return undefined;
    webhook.attempts += 1;
    return webhook;
  }

  async applyInboundAtomically(event: InboundMessageEvent): Promise<ConversationSnapshot> {
    return this.withLock(async () => {
      const webhook = this.webhookEvents.get(event.webhookEventId);
      if (!webhook || webhook.organizationId !== event.organizationId) throw new Error("Webhook event not found");
      const previousContacts = this.contacts.map((item) => ({ ...item }));
      const previousConversations = this.conversations.map((item) => ({ ...item }));
      const previousMessages = this.messages.map((item) => ({ ...item }));

      try {
        const duplicate = this.messages.find((item) => item.organizationId === event.organizationId && item.externalMessageId === event.externalMessageId);
        if (duplicate) {
          webhook.status = "PROCESSED";
          return this.conversations.find((item) => item.conversationId === duplicate.conversationId)!;
        }

        let contact = this.contacts.find((item) => item.organizationId === event.organizationId && item.externalContactId === event.externalContactId);
        if (!contact) {
          contact = { id: `contact-${this.contacts.length + 1}`, organizationId: event.organizationId, externalContactId: event.externalContactId, ...(event.contactName ? { name: event.contactName } : {}) };
          this.contacts.push(contact);
        }
        let conversation = this.conversations.find((item) => item.organizationId === event.organizationId && item.contactId === contact.id);
        if (!conversation) {
          conversation = { conversationId: `conversation-${this.conversations.length + 1}`, organizationId: event.organizationId, contactId: contact.id, lastMessageBody: event.body, lastMessageAt: event.occurredAt };
          this.conversations.push(conversation);
        }
        this.messages.push({ id: `message-${this.messages.length + 1}`, organizationId: event.organizationId, conversationId: conversation.conversationId, externalMessageId: event.externalMessageId, body: event.body, occurredAt: event.occurredAt });

        if (this.failAfterMessageOnce) {
          this.failAfterMessageOnce = false;
          throw new Error("simulated partial failure");
        }
        if (event.occurredAt.getTime() >= conversation.lastMessageAt.getTime()) {
          conversation.lastMessageBody = event.body;
          conversation.lastMessageAt = event.occurredAt;
        }
        webhook.status = "PROCESSED";
        return conversation;
      } catch (error) {
        this.contacts = previousContacts;
        this.conversations = previousConversations;
        this.messages = previousMessages;
        webhook.status = "PENDING";
        throw error;
      }
    });
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.locked;
    let release: () => void = () => undefined;
    this.locked = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }
}
