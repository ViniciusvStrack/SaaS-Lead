import { createHash } from "node:crypto";
import { MetaCloudProvider, type SendInput } from "@saas-lead/whatsapp";

import type { SendProvider } from "./send-message.processor.js";

type WhatsAppNumberLike = {
  findFirst: (args: {
    where: { externalNumberId: string };
    select: { organizationId: boolean; accountId: boolean };
  }) => Promise<{ accountId: string } | null>;
};

type WhatsAppAccountLike = {
  findUnique: (args: { where: { id: string }; select: { credentialReference: boolean } }) => Promise<{ credentialReference: string } | null>;
};

export type SendDatabaseLike = {
  whatsAppNumber: WhatsAppNumberLike;
  whatsAppAccount: WhatsAppAccountLike;
};

/**
 * Adapta o MetaCloudProvider para a interface SendProvider do worker.
 * O access token é lido do WhatsAppAccount.credentialReference (para MVP trata-se
 * do próprio token; em produção deve-se resolver via secrets manager).
 * A chave de idempotência local é enviada como hash truncado no payload para
 * rastreamento próprio (a Meta não expõe cabeçalho de idempotência).
 */
export class MetaSendProvider implements SendProvider {
  constructor(
    private readonly database: SendDatabaseLike,
    private readonly graphVersion: string,
    private readonly fallbackAccessToken: string,
    private readonly fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch,
  ) {
    if (!graphVersion || graphVersion.includes("SET_")) throw new Error("A pinned Meta Graph API version is required");
  }

  async send(input: {
    phoneNumberId: string;
    to: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<{ messageId: string }> {
    const number = await this.database.whatsAppNumber.findFirst({
      where: { externalNumberId: input.phoneNumberId },
      select: { organizationId: true, accountId: true },
    });
    if (!number) throw new Error(`WhatsApp number ${input.phoneNumberId} not found`);

    const account = await this.database.whatsAppAccount.findUnique({
      where: { id: number.accountId },
      select: { credentialReference: true },
    });
    const accessToken = account?.credentialReference ?? this.fallbackAccessToken;

    const provider = new MetaCloudProvider(this.graphVersion, accessToken, this.fetcher);
    const result = await provider.send({
      phoneNumberId: input.phoneNumberId,
      to: input.to,
      payload: {
        ...input.payload,
        ...(input.idempotencyKey ? { idempotencyKey: createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 32) } : {}),
      } as SendInput["payload"],
    });
    return { messageId: result.messageId };
  }
}
