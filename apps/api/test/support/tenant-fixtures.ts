import type { DatabaseClient } from "@saas-lead/database";

export type TenantRole = "OWNER" | "ADMIN" | "AGENT";

export type TenantFixture = {
  organization: { id: string; slug: string };
  user: { id: string; email: string };
  membership: { id: string; role: TenantRole; status: "ACTIVE" };
};

export type TenantPair = { first: TenantFixture; second: TenantFixture };

type FixtureOptions = {
  database: DatabaseClient;
  runId?: string;
};

const slugPart = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 24);

export async function seedTenant({ database, runId = crypto.randomUUID() }: FixtureOptions): Promise<TenantFixture> {
  const suffix = slugPart(runId);
  const email = `tenant-${suffix}@test.invalid`;
  const organization = await database.organization.create({
    data: { name: `Test tenant ${suffix}`, slug: `test-${suffix}` },
    select: { id: true, slug: true },
  });
  const user = await database.user.create({
    data: { email, name: `Test user ${suffix}` },
    select: { id: true, email: true },
  });
  const membership = await database.organizationMember.create({
    data: { organizationId: organization.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
    select: { id: true, role: true, status: true },
  });
  return { organization, user, membership: membership as TenantFixture["membership"] };
}

export async function seedTenantPair({ database, runId = crypto.randomUUID() }: FixtureOptions): Promise<TenantPair> {
  return {
    first: await seedTenant({ database, runId: `${runId}-a` }),
    second: await seedTenant({ database, runId: `${runId}-b` }),
  };
}

export async function cleanupTenant(database: DatabaseClient, tenant: TenantFixture): Promise<void> {
  await database.organization.delete({ where: { id: tenant.organization.id } });
}

export async function cleanupTenantPair(database: DatabaseClient, pair: TenantPair): Promise<void> {
  await cleanupTenant(database, pair.first);
  await cleanupTenant(database, pair.second);
}
