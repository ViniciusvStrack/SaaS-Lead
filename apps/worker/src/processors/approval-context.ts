import { createHash } from "node:crypto";
import type { PolicyInput } from "@saas-lead/policy";

export const customerCareWindowMs = 24 * 60 * 60 * 1000;

const templateStatuses = ["APPROVED", "PENDING", "REJECTED"] as const;
type TemplateStatus = (typeof templateStatuses)[number];

export interface ApprovalContextSnapshot {
  consent: { status: string; capturedAt: Date } | null;
  lastInboundAt: Date | null;
  template: { status: string } | null;
  accountActive: boolean;
  lastOutboundAt: Date | null;
  cooldownSeconds: number | undefined;
  now: Date;
}

export type OutboundApprovalContext = Omit<PolicyInput, "actorCanApprove" | "contentHash" | "approvedContentHash">;

export function deriveApprovalContext(input: ApprovalContextSnapshot): OutboundApprovalContext {
  const consentStatus =
    input.consent === null
      ? "UNKNOWN"
      : input.consent.status === "GRANTED"
        ? "GRANTED"
        : input.consent.status === "REVOKED"
          ? "REVOKED"
          : "UNKNOWN";

  return {
    consentStatus,
    optedOut: input.consent?.status === "REVOKED",
    withinCustomerCareWindow:
      input.lastInboundAt !== null &&
      input.now.getTime() - input.lastInboundAt.getTime() <= customerCareWindowMs,
    templateStatus: templateStatusOf(input.template),
    cooldownSatisfied: withinCooldown(input.lastOutboundAt, input.cooldownSeconds, input.now),
    accountActive: input.accountActive,
  };
}

function templateStatusOf(template: { status: string } | null): TemplateStatus | undefined {
  return template !== null && templateStatuses.includes(template.status as TemplateStatus)
    ? (template.status as TemplateStatus)
    : undefined;
}

function withinCooldown(lastOutboundAt: Date | null, cooldownSeconds: number | undefined, now: Date): boolean {
  if (lastOutboundAt === null || cooldownSeconds === undefined || !Number.isFinite(cooldownSeconds)) return true;
  return now.getTime() - lastOutboundAt.getTime() >= cooldownSeconds * 1_000;
}

export function readCooldownSeconds(commercialPolicies: unknown): number | undefined {
  if (typeof commercialPolicies !== "object" || commercialPolicies === null) return undefined;
  const value = (commercialPolicies as Record<string, unknown>).outboundCooldownSeconds;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
