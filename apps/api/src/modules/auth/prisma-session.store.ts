import type { DatabaseClient } from "@saas-lead/database";
import type { SessionRecord, SessionStore } from "./session.service.js";

export class PrismaSessionStore implements SessionStore {
  constructor(private readonly database: DatabaseClient) {}

  async save(session: SessionRecord): Promise<void> {
    await this.database.session.create({ data: session });
  }

  async findByHash(tokenHash: string): Promise<SessionRecord | undefined> {
    const record = await this.database.session.findUnique({ where: { tokenHash } });
    return record ?? undefined;
  }

  async delete(tokenHash: string): Promise<void> {
    await this.database.session.deleteMany({ where: { tokenHash } });
  }
}
