import { describe, expect, it } from "vitest";
import { RetentionProcessor, type RetentionRecord } from "../src/processors/retention.processor.js";
describe("RetentionProcessor", () => {
  it("anonymizes expired tenant records but preserves legal holds", async () => {
    const records: RetentionRecord[] = [{ id: "old", organizationId: "org-a", occurredAt: new Date("2025-01-01"), legalHold: false }, { id: "hold", organizationId: "org-a", occurredAt: new Date("2025-01-01"), legalHold: true }];
    const anonymized: string[] = [];
    const store = { listExpired: async () => records, anonymize: async (id: string) => { anonymized.push(id); } };
    const result = await new RetentionProcessor(store).process({ organizationId: "org-a", retentionDays: 365, now: new Date("2026-10-01") });
    expect(anonymized).toEqual(["old"]);
    expect(result).toMatchObject({ scanned: 2, anonymized: 1, retainedByLegalHold: 1 });
  });
});
