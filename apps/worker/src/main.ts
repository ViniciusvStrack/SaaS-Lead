import { loadConfig } from "@saas-lead/config";
import { createLogger, withCorrelation } from "@saas-lead/observability";

import { validateWorkerEnv } from "./worker-env.js";

validateWorkerEnv(process.env);
const config = loadConfig(process.env);
createLogger(withCorrelation({})).info("worker ready", { nodeEnv: config.nodeEnv });
