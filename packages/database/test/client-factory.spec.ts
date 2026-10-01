import { describe, expect, it } from "vitest";
import { createDatabaseClient } from "../src/client.js";

describe("createDatabaseClient", () => {
  it("creates the Prisma 7 client with the PostgreSQL driver adapter", async () => {
    const client = createDatabaseClient("postgresql://user:password@localhost:5432/saas_lead");

    expect(client.$connect).toBeTypeOf("function");
    expect(client.$disconnect).toBeTypeOf("function");
    await client.$disconnect();
  });

  it("rejects a missing or non-PostgreSQL connection URL", () => {
    expect(() => createDatabaseClient("")).toThrow("DATABASE_URL");
    expect(() => createDatabaseClient("redis://localhost:6379")).toThrow("PostgreSQL");
  });
});
