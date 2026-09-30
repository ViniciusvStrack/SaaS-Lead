import type { PrismaClient } from "@prisma/client";

export type DatabaseClient = PrismaClient;

export function requireDatabaseClient(client: PrismaClient | undefined): PrismaClient {
  if (!client) {
    throw new Error("Database client has not been initialized");
  }
  return client;
}
