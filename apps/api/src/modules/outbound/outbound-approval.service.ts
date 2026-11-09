import { createHash, randomUUID } from "node:crypto";
import type { TenantContext } from "@saas-lead/database";
import type { PolicyDecision, PolicyEngine } from "@saas-lead/policy";

import { AuthorizationService } from "../auth/authorization.service.js";
import type { ApprovalContext } from "./approval-context.js";

export interface ApproveOutboundInput {
  opportunityId?: string;
  suggestionId?: string;
  conversationId: string;
  content: string;
  idempotencyKey: string;
  templateId?: string;
  /** Only used by in-process tests. The HTTP controller never forwards this. */
  context?: ApprovalContext;
}

export interface OutboundRecord {
  id: string;
  organizationId: string;
  conversationId: string;
  opportunityId?: string;
  suggestionId?: string;
  templateId?: string;
  content: string;
  contentHash: string;
  idempotencyKey: string;
  status: "APPROVED" | "BLOCKED";
  actorCanApprove: boolean;
  context: ApprovalContext;
  policyDecision: PolicyDecision;
  createdAt: Date;
}

export interface SendJob {
  queue: "message.send";
  outboundMessageId: string;
  organizationId: string;
}

export interface OutboundStore {
  find(organizationId: string, idempotencyKey: string): Promise<OutboundRecord | undefined>;
  save(record: OutboundRecord): Promise<OutboundRecord>;
}

export interface OutboundQueue {
  publish(job: SendJob): Promise<void>;
}

export interface ApprovalContextReader {
  read(tenant: TenantContext, input: ApproveOutboundInput): Promise<ApprovalContext>;
}

export type OutboundApprovalErrorCode =
  | "CONTEXT_REQUIRED"
  | "CONVERSATION_NOT_FOUND"
  | "OPPORTUNITY_NOT_FOUND"
  | "SUGGESTION_NOT_FOUND"
  | "INVALID_INPUT";

export class OutboundApprovalError extends Error {
  constructor(
    readonly code: OutboundApprovalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OutboundApprovalError";
  }
}

export class InMemoryOutboundStore implements OutboundStore, OutboundQueue {
  private readonly records = new Map<string, OutboundRecord>();
  readonly queuedJobs: SendJob[] = [];
  readonly publishedJobs: SendJob[] = [];
  private readonly publishedJobIds = new Set<string>();
  publishCalls = 0;

  async find(organizationId: string, idempotencyKey: string): Promise<OutboundRecord | undefined> {
    return this.records.get(`${organizationId}:${idempotencyKey}`);
  }

  async save(record: OutboundRecord): Promise<OutboundRecord> {
    this.records.set(`${record.organizationId}:${record.idempotencyKey}`, record);
    return record;
  }

  async publish(job: SendJob): Promise<void> {
    this.publishCalls += 1;
    if (this.publishedJobIds.has(job.outboundMessageId)) return;
    this.publishedJobIds.add(job.outboundMessageId);
    this.publishedJobs.push(job);
    this.queuedJobs.push(job);
  }
}

export interface OutboundApprovalOptions {
  queue?: OutboundQueue;
  context?: ApprovalContextReader;
  authorization?: Pick<AuthorizationService, "authorize">;
  now?: () => Date;
}

export class OutboundApprovalService {
  private readonly queue: OutboundQueue | undefined;
  private readonly authorization: Pick<AuthorizationService, "authorize">;
  private readonly now: () => Date;

  constructor(
    private readonly store: OutboundStore,
    private readonly policy: PolicyEngine,
    options: OutboundApprovalOptions = {},
  ) {
    this.queue = options.queue ?? (hasPublish(store) ? store : undefined);
    this.authorization = options.authorization ?? new AuthorizationService();
    this.now = options.now ?? (() => new Date());
    this.contextReader = options.context;
  }

  private readonly contextReader: ApprovalContextReader | undefined;

  async approve(tenant: TenantContext, input: ApproveOutboundInput): Promise<OutboundRecord> {
    if (!input.conversationId.trim() || !input.content.trim() || !input.idempotencyKey.trim()) {
      throw new OutboundApprovalError("INVALID_INPUT", "conversationId, content and idempotencyKey are required");
    }

    const existing = await this.store.find(tenant.organizationId, input.idempotencyKey);
    if (existing) {
      // Republish even for the duplicate: the deterministic job id de-duplicates
      // and recovers an approval whose first enqueue failed after persistence.
      if (existing.status === "APPROVED") await this.publish(existing);
      return existing;
    }

    const context = this.contextReader ? await this.contextReader.read(tenant, input) : input.context;
    if (!context) throw new OutboundApprovalError("CONTEXT_REQUIRED", "Approval context is required");

    const contentHash = createHash("sha256").update(input.content).digest("hex");
    const actorCanApprove = this.authorization.authorize(
      "message.approve",
      { type: "conversation", organizationId: tenant.organizationId },
      { organizationId: tenant.organizationId, userId: tenant.userId, role: tenant.role },
    ).allowed;
    const policyDecision = this.policy.evaluate({
      ...context,
      actorCanApprove,
      contentHash,
      approvedContentHash: contentHash,
    });
    const record = await this.store.save({
      id: randomUUID(),
      organizationId: tenant.organizationId,
      conversationId: input.conversationId,
      ...(input.opportunityId ? { opportunityId: input.opportunityId } : {}),
      ...(input.suggestionId ? { suggestionId: input.suggestionId } : {}),
      ...(input.templateId ? { templateId: input.templateId } : {}),
      content: input.content,
      contentHash,
      idempotencyKey: input.idempotencyKey,
      status: policyDecision.decision,
      actorCanApprove,
      context,
      policyDecision,
      createdAt: this.now(),
    });
    if (record.status === "APPROVED") await this.publish(record);
    return record;
  }

  private async publish(record: OutboundRecord): Promise<void> {
    if (!this.queue) throw new OutboundApprovalError("CONTEXT_REQUIRED", "message.send queue is not configured");
    await this.queue.publish({
      queue: "message.send",
      outboundMessageId: record.id,
      organizationId: record.organizationId,
    });
  }
}

function hasPublish(store: OutboundStore): store is OutboundStore & OutboundQueue {
  return typeof (store as Partial<OutboundQueue>).publish === "function";
}
