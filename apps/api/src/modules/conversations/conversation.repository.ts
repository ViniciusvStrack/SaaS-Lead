import type { TenantContext } from "@saas-lead/database";
import type { ConversationSnapshot } from "@saas-lead/contracts";

export abstract class ConversationRepository {
  abstract list(tenant: TenantContext): Promise<ConversationSnapshot[]>;
  abstract find(tenant: TenantContext, conversationId: string): Promise<ConversationSnapshot | undefined>;
}
