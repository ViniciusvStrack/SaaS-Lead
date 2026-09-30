import { describe, expect, it } from "vitest";

import { withCorrelation } from "../src/correlation.js";
import { createLogger } from "../src/logger.js";

describe("withCorrelation", () => {
  it("preserves a supplied request ID and metadata", () => {
    expect(
      withCorrelation({ requestId: "req-existing", organizationId: "org-1" }),
    ).toEqual({ requestId: "req-existing", organizationId: "org-1" });
  });

  it("generates a UUID request ID when one is absent", () => {
    expect(withCorrelation({}).requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("createLogger", () => {
  it("writes structured metadata and redacts sensitive keys", () => {
    const records: unknown[] = [];
    const logger = createLogger(
      { requestId: "req-1", organizationId: "org-1" },
      (record) => records.push(record),
    );

    logger.info("provider configured", {
      provider: "meta",
      accessToken: "secret-token",
      nested: { password: "secret-password", status: "ok" },
    });

    expect(records).toEqual([
      {
        level: "info",
        message: "provider configured",
        requestId: "req-1",
        organizationId: "org-1",
        provider: "meta",
        accessToken: "[REDACTED]",
        nested: { password: "[REDACTED]", status: "ok" },
      },
    ]);
  });
});
