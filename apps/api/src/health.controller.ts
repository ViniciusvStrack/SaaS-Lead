import { Controller, Get, HttpException, Inject } from "@nestjs/common";

import { ReadinessService } from "./readiness.service.js";

@Controller()
export class HealthController {
  constructor(@Inject(ReadinessService) private readonly readiness: ReadinessService) {}

  @Get("health")
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    const result = await this.readiness.check();
    if (!result.ready) throw new HttpException(result, 503);
    return result;
  }
}
