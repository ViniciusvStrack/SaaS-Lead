import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller.js";
import { DATABASE_PROBE, ReadinessService, REDIS_PROBE } from "./readiness.service.js";

@Module({
  controllers: [HealthController],
  providers: [
    ReadinessService,
    { provide: DATABASE_PROBE, useValue: async () => false },
    { provide: REDIS_PROBE, useValue: async () => false },
  ],
})
export class AppModule {}
