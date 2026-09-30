import "reflect-metadata";

import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { OrganizationsModule } from "../src/modules/organizations/organizations.module.js";

describe("tenant isolation", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => close?.());

  async function createTestApp() {
    const module = await Test.createTestingModule({ imports: [OrganizationsModule] }).compile();
    const app = module.createNestApplication();
    await app.init();
    close = () => app.close();
    return app;
  }

  const tenantA = {
    "x-organization-id": "org-a",
    "x-user-id": "user-a",
    "x-role": "OWNER",
  };
  const tenantB = {
    "x-organization-id": "org-b",
    "x-user-id": "user-b",
    "x-role": "OWNER",
  };

  it("reads settings only inside the active tenant", async () => {
    const app = await createTestApp();

    await request(app.getHttpServer())
      .put("/organizations/org-a/settings")
      .set(tenantA)
      .send({ description: "Tenant A" })
      .expect(200);

    const ownSettings = await request(app.getHttpServer())
      .get("/organizations/org-a/settings")
      .set(tenantA)
      .expect(200);

    expect(ownSettings.body).toEqual(expect.objectContaining({ description: "Tenant A" }));

    await request(app.getHttpServer())
      .get("/organizations/org-a/settings")
      .set(tenantB)
      .expect(404, { statusCode: 404, message: "Organization not found", error: "Not Found" });
  });

  it("cannot update another tenant even when organizationId is supplied in the body", async () => {
    const app = await createTestApp();

    await request(app.getHttpServer())
      .put("/organizations/org-a/settings")
      .set(tenantA)
      .send({ description: "Original" })
      .expect(200);

    await request(app.getHttpServer())
      .put("/organizations/org-a/settings")
      .set(tenantB)
      .send({ organizationId: "org-a", description: "Compromised" })
      .expect(404);

    const response = await request(app.getHttpServer())
      .get("/organizations/org-a/settings")
      .set(tenantA)
      .expect(200);

    expect(response.body.description).toBe("Original");
  });

  it("does not reveal whether a foreign organization exists", async () => {
    const app = await createTestApp();

    const existing = await request(app.getHttpServer())
      .get("/organizations/org-a/settings")
      .set(tenantB)
      .expect(404);
    const missing = await request(app.getHttpServer())
      .get("/organizations/does-not-exist/settings")
      .set(tenantB)
      .expect(404);

    expect(existing.body).toEqual(missing.body);
  });
});
