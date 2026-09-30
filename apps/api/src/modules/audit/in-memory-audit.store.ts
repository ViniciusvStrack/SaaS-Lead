import { Injectable } from "@nestjs/common";

import type { AuditEntry, AuditStore } from "./audit.service.js";

@Injectable()
export class InMemoryAuditStore implements AuditStore {
  readonly entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}
