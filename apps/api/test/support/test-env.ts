const TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/saas_lead_test";

export type TestEnvironment = {
  databaseUrl: string;
  restore(): void;
};

/** Configura o mínimo necessário sem sobrescrever uma URL fornecida pelo runner. */
export function useTestEnvironment(overrides: Record<string, string | undefined> = {}): TestEnvironment {
  const previous = new Map<string, string | undefined>();
  const values: Record<string, string | undefined> = {
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? TEST_DATABASE_URL,
    NODE_ENV: "test",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return {
    databaseUrl: values.DATABASE_URL ?? TEST_DATABASE_URL,
    restore() {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    },
  };
}

export function hasPostgresTestDatabase(): boolean {
  return Boolean(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
}
