import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { PolicyEngine } from "@saas-lead/policy";

import { AuthorizationService } from "../auth/authorization.service.js";
import { OutboundController } from "./outbound.controller.js";
import { OutboundApprovalService } from "./outbound-approval.service.js";
import { PrismaApprovalContextReader } from "./prisma-approval-context.reader.js";
import { PrismaOutboundStore } from "./prisma-outbound.store.js";
import { BullMqSendQueue } from "./outbound-send.publisher.js";

const SEND_QUEUE_PUBLISHER = "SEND_QUEUE_PUBLISHER";

@Module({
  controllers: [OutboundController],
  providers: [
    { provide: "OUTBOUNDS_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    {
      provide: SEND_QUEUE_PUBLISHER,
      useFactory: () => new BullMqSendQueue(process.env.REDIS_URL ?? ""),
    },
    {
      provide: PrismaOutboundStore,
      useFactory: (database: DatabaseClient) => new PrismaOutboundStore(database),
      inject: ["OUTBOUNDS_DATABASE"],
    },
    {
      provide: PrismaApprovalContextReader,
      useFactory: (database: DatabaseClient) => new PrismaApprovalContextReader(database),
      inject: ["OUTBOUNDS_DATABASE"],
    },
    AuthorizationService,
    {
      provide: PolicyEngine,
      useFactory: () => new PolicyEngine(),
    },
    {
      provide: OutboundApprovalService,
      useFactory: (
        store: PrismaOutboundStore,
        policy: PolicyEngine,
        publisher: unknown,
        reader: PrismaApprovalContextReader,
        authorization: AuthorizationService,
      ) =>
        new OutboundApprovalService(store, policy, {
          queue: publisher as { publish(job: unknown): Promise<void> },
          context: reader,
          authorization,
        }),
      inject: [
        PrismaOutboundStore,
        PolicyEngine,
        SEND_QUEUE_PUBLISHER,
        PrismaApprovalContextReader,
        AuthorizationService,
      ],
    },
  ],
  exports: [OutboundApprovalService, PrismaApprovalContextReader],
})
export class OutboundModule implements OnModuleDestroy {
  constructor(@Inject("OUTBOUNDS_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
