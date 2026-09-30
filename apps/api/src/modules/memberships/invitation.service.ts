import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

import { hashOpaqueToken, type SessionRole } from "../auth/session.service.js";

export interface InvitationRecord {
  tokenHash: string;
  email: string;
  organizationId: string;
  role: SessionRole;
  expiresAt: Date;
  acceptedBy?: string;
  acceptedAt?: Date;
}

export interface InvitationStore {
  save(invitation: InvitationRecord): Promise<void>;
  findByHash(tokenHash: string): Promise<InvitationRecord | undefined>;
}

@Injectable()
export class InMemoryInvitationStore implements InvitationStore {
  private readonly invitations = new Map<string, InvitationRecord>();

  async save(invitation: InvitationRecord): Promise<void> {
    this.invitations.set(invitation.tokenHash, invitation);
  }

  async findByHash(tokenHash: string): Promise<InvitationRecord | undefined> {
    return this.invitations.get(tokenHash);
  }
}

@Injectable()
export class InvitationService {
  constructor(
    private readonly store: InvitationStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: Omit<InvitationRecord, "tokenHash" | "acceptedAt" | "acceptedBy">): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.store.save({ ...input, tokenHash: hashOpaqueToken(token) });
    return token;
  }

  async accept(token: string, userId: string): Promise<Pick<InvitationRecord, "email" | "organizationId" | "role">> {
    const invitation = await this.store.findByHash(hashOpaqueToken(token));
    const invalid =
      !invitation || invitation.acceptedAt !== undefined || invitation.expiresAt.getTime() <= this.now().getTime();
    if (invalid) throw new Error("Invitation is invalid");

    invitation.acceptedAt = this.now();
    invitation.acceptedBy = userId;
    await this.store.save(invitation);
    return { email: invitation.email, organizationId: invitation.organizationId, role: invitation.role };
  }
}
