import type { TenantContext } from "@saas-lead/database";

export interface MessageView { id: string; conversationId: string; body?: string; occurredAt: Date }

export abstract class MessageRepository {
  abstract listByConversation(tenant: TenantContext, conversationId: string): Promise<MessageView[]>;
}
