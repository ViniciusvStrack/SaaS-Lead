import { Body, Controller, Headers, Inject, Post, UnauthorizedException } from "@nestjs/common";
import type { OrganizationId, UserId } from "@saas-lead/contracts";
import type { SessionRole } from "../auth/session.service.js";
import { SessionService } from "../auth/session.service.js";
import {
  OutboundApprovalError,
  OutboundApprovalService,
  type ApproveOutboundInput,
  type OutboundRecord,
} from "./outbound-approval.service.js";

export interface ApproveOutboundBody {
  conversationId?: string;
  opportunityId?: string;
  suggestionId?: string;
  content?: string;
  idempotencyKey?: string;
  templateId?: string;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(field);
  return value.trim();
}

function requireNonBlankString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(field);
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(field);
  return value;
}

export function parseApproveInput(body: unknown): Omit<ApproveOutboundInput, "context"> {
  if (!body || typeof body !== "object") throw new Error("body");
  const record = body as Record<string, unknown>;
  const conversationId = requireNonEmptyString(record.conversationId, "conversationId");
  const content = requireNonBlankString(record.content, "content");
  const idempotencyKey = requireNonEmptyString(record.idempotencyKey, "idempotencyKey");
  const result: Omit<ApproveOutboundInput, "context"> = { conversationId, content, idempotencyKey };
  if (record.opportunityId !== undefined) result.opportunityId = optionalString(record.opportunityId, "opportunityId")!;
  if (record.suggestionId !== undefined) result.suggestionId = optionalString(record.suggestionId, "suggestionId")!;
  if (record.templateId !== undefined) result.templateId = optionalString(record.templateId, "templateId")!;
  return result;
}

function extractSessionCookie(cookie: string | undefined): string | undefined {
  return cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("saas_lead_session="))?.slice("saas_lead_session=".length);
}

@Controller("outbound")
export class OutboundController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(OutboundApprovalService) private readonly approvals: OutboundApprovalService,
  ) {}

  @Post("approvals")
  async approve(@Headers("cookie") cookie: string | undefined, @Body() body: unknown): Promise<OutboundRecord> {
    const token = extractSessionCookie(cookie);
    if (!token) throw new UnauthorizedException("Authentication required");
    const session = await this.sessions.requireSession(token);

    const input = parseApproveInput(body);

    try {
      return await this.approvals.approve(
        {
          organizationId: session.organizationId as OrganizationId,
          userId: session.userId as UserId,
          role: session.role as SessionRole,
        },
        input,
      );
    } catch (error) {
      if (error instanceof OutboundApprovalError) throw new UnauthorizedException(error.message);
      throw error;
    }
  }
}
