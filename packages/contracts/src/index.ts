export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type { ConversationId, JobId, OrganizationId, UserId, WebhookEventId } from "./common/ids.js";
