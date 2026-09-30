import { randomUUID } from "node:crypto";

export interface CorrelationInput {
  requestId?: string;
  organizationId?: string;
  conversationId?: string;
  webhookEventId?: string;
  jobId?: string;
}

export interface CorrelationContext extends CorrelationInput {
  requestId: string;
}

export function withCorrelation(input: CorrelationInput): CorrelationContext {
  return { ...input, requestId: input.requestId ?? randomUUID() };
}
