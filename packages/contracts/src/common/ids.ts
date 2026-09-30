import type { Brand } from "../index.js";

export type UserId = Brand<string, "UserId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type ConversationId = Brand<string, "ConversationId">;
export type WebhookEventId = Brand<string, "WebhookEventId">;
export type JobId = Brand<string, "JobId">;
