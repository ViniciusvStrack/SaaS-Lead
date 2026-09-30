import { Module } from "@nestjs/common";

import { AuditService } from "./audit.service.js";
import { InMemoryAuditStore } from "./in-memory-audit.store.js";

@Module({
  providers: [
    InMemoryAuditStore,
    {
      provide: "AUDIT_SERVICE",
      useFactory: (store: InMemoryAuditStore) => new AuditService(store),
      inject: [InMemoryAuditStore],
    },
  ],
  exports: ["AUDIT_SERVICE", InMemoryAuditStore],
})
export class AuditModule {}
