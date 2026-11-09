import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller.js";
import { createConnectivityProbe } from "./connectivity-probe.js";
import { OrganizationsModule } from "./modules/organizations/organizations.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module.js";
import { WebhooksModule } from "./modules/webhooks/webhooks.module.js";
<<<<<<< HEAD
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module.js";
import { BusinessSettingsModule } from "./modules/business-settings/business-settings.module.js";
import { WhatsAppModule } from "./modules/whatsapp/whatsapp.module.js";
import { OutboundModule } from "./modules/outbound/outbound.module.js";
import { DATABASE_PROBE, ReadinessService, REDIS_PROBE } from "./readiness.service.js";

@Module({
  imports: [AuthModule, OrganizationsModule, OpportunitiesModule, WebhooksModule, SubscriptionsModule, BusinessSettingsModule, WhatsAppModule, OutboundModule],
=======
import { DATABASE_PROBE, ReadinessService, REDIS_PROBE } from "./readiness.service.js";

@Module({
  imports: [AuthModule, OrganizationsModule, OpportunitiesModule, WebhooksModule],
>>>>>>> 40e2bbd (feat: expose persistent Meta webhook endpoint)
  controllers: [HealthController],
  providers: [
    ReadinessService,
    { provide: DATABASE_PROBE, useValue: createConnectivityProbe(process.env.DATABASE_URL) },
    { provide: REDIS_PROBE, useValue: createConnectivityProbe(process.env.REDIS_URL) },
  ],
})
export class AppModule {}
