import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { WebhooksController } from "./webhooks.controller.js";
import { PrismaWebhookStore } from "./prisma-webhook.store.js";
import { WebhookInbox } from "./webhook-inbox.js";

@Module({
  controllers: [WebhooksController],
  providers: [
    { provide: "WEBHOOKS_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaWebhookStore, useFactory: (database: DatabaseClient) => new PrismaWebhookStore(database), inject: ["WEBHOOKS_DATABASE"] },
    { provide: WebhookInbox, useFactory: (store: PrismaWebhookStore) => new WebhookInbox(process.env.META_APP_SECRET ?? "", store, store), inject: [PrismaWebhookStore] },
    { provide: "META_WEBHOOK_VERIFY_TOKEN", useFactory: () => process.env.META_WEBHOOK_VERIFY_TOKEN ?? "" },
  ],
})
export class WebhooksModule implements OnModuleDestroy {
  constructor(@Inject("WEBHOOKS_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
