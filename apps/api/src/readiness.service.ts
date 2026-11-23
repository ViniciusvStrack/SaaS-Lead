import { Inject, Injectable } from "@nestjs/common";

export type DependencyProbe = () => Promise<boolean>;
export const DATABASE_PROBE = Symbol("DATABASE_PROBE");
export const REDIS_PROBE = Symbol("REDIS_PROBE");

export interface ReadinessResult {
  ready: boolean;
  dependencies: { database: boolean; redis: boolean };
  latencyMs: { database: number; redis: number };
}

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(DATABASE_PROBE) private readonly databaseProbe: DependencyProbe,
    @Inject(REDIS_PROBE) private readonly redisProbe: DependencyProbe,
  ) {}

  async check(): Promise<ReadinessResult> {
    const probe = async (check: DependencyProbe) => {
      const started = Date.now();
      const healthy = await check().catch(() => false);
      return { healthy, latency: Date.now() - started };
    };
    const [database, redis] = await Promise.all([probe(this.databaseProbe), probe(this.redisProbe)]);
    return { ready: database.healthy && redis.healthy, dependencies: { database: database.healthy, redis: redis.healthy }, latencyMs: { database: database.latency, redis: redis.latency } };
  }
}
