export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type { ConversationId, JobId, OrganizationId, UserId, WebhookEventId } from "./common/ids.js";
export type { ConversationSnapshot, InboundMessageEvent } from "./events/inbound-message.js";
export type { OpportunityCandidate, OpportunityPriority, OpportunityType } from "./opportunities/opportunity.js";
export { businessDays } from "./business-settings/business-settings.js";
export type { BusinessDay, BusinessHoursPeriod, BusinessSettings, BusinessSettingsUpdate } from "./business-settings/business-settings.js";
