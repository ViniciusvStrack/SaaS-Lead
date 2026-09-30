export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type { ConversationId, JobId, OrganizationId, UserId, WebhookEventId } from "./common/ids.js";
export type { ConversationSnapshot, InboundMessageEvent } from "./events/inbound-message.js";
export type { OpportunityCandidate, OpportunityPriority, OpportunityType } from "./opportunities/opportunity.js";
