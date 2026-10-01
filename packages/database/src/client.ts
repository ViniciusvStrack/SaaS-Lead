import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "@prisma/client";
import { PrismaClient as RuntimePrismaClient } from "@prisma/client";

export type DatabaseClient = PrismaClient;

export function requireDatabaseClient(client: PrismaClient | undefined): PrismaClient {
  if (!client) {
    throw new Error("Database client has not been initialized");
  }
  return client;
}

export function createDatabaseClient(connectionString: string): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const parsed = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
  const adapter = new PrismaPg({ connectionString });
  return new RuntimePrismaClient({ adapter });
}
