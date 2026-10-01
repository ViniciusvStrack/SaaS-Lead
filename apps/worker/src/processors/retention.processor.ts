export type RetentionRecord = { id: string; organizationId: string; occurredAt: Date; legalHold: boolean };
export interface RetentionStore { listExpired(organizationId: string, before: Date): Promise<RetentionRecord[]>; anonymize(recordId: string): Promise<void> }
export class RetentionProcessor {
  constructor(private readonly store: RetentionStore) {}
  async process(input: { organizationId: string; retentionDays: number; now: Date }) {
    if (!Number.isInteger(input.retentionDays) || input.retentionDays < 1) throw new Error("retentionDays must be a positive integer");
    const before = new Date(input.now.getTime() - input.retentionDays * 86_400_000);
    const expired = await this.store.listExpired(input.organizationId, before);
    const eligible = expired.filter((record) => record.organizationId === input.organizationId && !record.legalHold);
    await Promise.all(eligible.map((record) => this.store.anonymize(record.id)));
    return { scanned: expired.length, anonymized: eligible.length, retainedByLegalHold: expired.length - eligible.length, cutoff: before };
  }
}
