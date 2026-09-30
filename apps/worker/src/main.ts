import { validateWorkerEnv } from "./worker-env.js";

validateWorkerEnv(process.env);
process.stdout.write("worker ready\n");
