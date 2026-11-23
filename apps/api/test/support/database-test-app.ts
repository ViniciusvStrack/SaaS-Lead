import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import type { TestEnvironment } from "./test-env.js";

export type DatabaseTestApp = {
  database: DatabaseClient;
  close(): Promise<void>;
};

/** Cria somente o cliente; migrations devem ser aplicadas pelo runner/CI. */
export function createDatabaseTestApp(environment: TestEnvironment): DatabaseTestApp {
  const database = createDatabaseClient(environment.databaseUrl);
  return {
    database,
    async close() {
      await database.$disconnect();
    },
  };
}
