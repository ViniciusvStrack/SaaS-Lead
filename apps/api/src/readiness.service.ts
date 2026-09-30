import { Inject, Injectable } from "@nestjs/common";

export type DependencyProbe = () => Promise<boolean>;
export const DATABASE_PROBE = Symbol("DATABASE_PROBE");
export const REDIS_PROBE = Symbol("REDIS_PROBE");

export interface ReadinessResult {
  ready: boolean;
  dependencies: { database: boolean; redis: boolean };
}

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(DATABASE_PROBE) private readonly databaseProbe: DependencyProbe,
    @Inject(REDIS_PROBE) private readonly redisProbe: DependencyProbe,
  ) {}

  async check(): Promise<ReadinessResult> {
    const [database, redis] = await Promise.all([
      this.databaseProbe().catch(() => false),
      this.redisProbe().catch(() => false),
    ]);
    return { ready: database && redis, dependencies: { database, redis } };
  }
}
