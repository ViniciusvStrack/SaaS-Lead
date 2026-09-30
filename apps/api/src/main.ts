import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { loadConfig } from "@saas-lead/config";
import { createLogger, withCorrelation } from "@saas-lead/observability";

import { AppModule } from "./app.module.js";

const config = loadConfig(process.env);
const logger = createLogger(withCorrelation({}));
const app = await NestFactory.create(AppModule);
await app.listen(Number(process.env.API_PORT ?? 3001));
logger.info("api ready", { nodeEnv: config.nodeEnv });
