import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import type { AuditService } from "../audit/audit.service.js";
import { InMemoryOrganizationRepository } from "./in-memory-organization.repository.js";
import type { OrganizationRepository } from "./organization.repository.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";

@Module({
  imports: [AuditModule],
  controllers: [OrganizationsController],
  providers: [
    InMemoryOrganizationRepository,
    { provide: "ORGANIZATION_REPOSITORY", useExisting: InMemoryOrganizationRepository },
    {
      provide: "ORGANIZATIONS_SERVICE",
      useFactory: (repository: OrganizationRepository, audit: AuditService) =>
        new OrganizationsService(repository, audit),
      inject: ["ORGANIZATION_REPOSITORY", "AUDIT_SERVICE"],
    },
  ],
  exports: ["ORGANIZATIONS_SERVICE", "ORGANIZATION_REPOSITORY"],
})
export class OrganizationsModule {}
