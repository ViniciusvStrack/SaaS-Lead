import { Controller, Get, Headers, HttpCode, Inject, Post, Query, Req, Res } from "@nestjs/common";
import { verifyMetaChallenge } from "./meta-verification.js";
import { WebhookInbox, type AcceptResult } from "./webhook-inbox.js";
import type { NormalizeQueuePublisher } from "./webhook-normalize.publisher.js";
import type { DatabaseClient } from "@saas-lead/database";
import type { ReconcileQueuePublisher } from "../outbound/outbound-reconcile.publisher.js";

type RawRequest = { rawBody?: Buffer };
type HttpResponse = { status(code: number): HttpResponse; send(body: string): HttpResponse; sendStatus(code: number): HttpResponse };

@Controller("webhooks/meta")
export class WebhooksController {
  constructor(
    @Inject(WebhookInbox)
    private readonly inbox: WebhookInbox,
    @Inject("META_WEBHOOK_VERIFY_TOKEN")
    private readonly verifyToken: string,
    @Inject("WEBHOOK_NORMALIZE_PUBLISHER")
    private readonly normalizeQueue: NormalizeQueuePublisher,
    @Inject("RECONCILE_QUEUE_PUBLISHER")
    private readonly reconcileQueue: ReconcileQueuePublisher,
    @Inject("WEBHOOKS_DATABASE")
    private readonly database: DatabaseClient,
  ) {}

  @Get()
  verify(@Query() query: Record<string, string | undefined>, @Res() response: HttpResponse): void {
    try {
      response.status(200).send(verifyMetaChallenge(query, this.verifyToken));
    } catch {
      response.sendStatus(403);
    }
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawRequest,
    @Headers("x-hub-signature-256") signature: string | undefined,
  ): Promise<AcceptResult> {
    const result = await this.inbox.accept(request.rawBody ?? Buffer.alloc(0), signature);
    if (result.accepted) {
      try {
        const payload = JSON.parse(request.rawBody?.toString("utf8") ?? "{}");
        const value = payload.entry?.[0]?.changes?.[0]?.value;
        // Delivery-status webhooks (no inbound message) trigger outbound
        // reconciliation: locate the original OutboundMessage and publish a
        // message.reconcile job. Message webhooks keep the existing
        // webhook.normalize publication.
        if (value?.statuses?.[0] && !value?.messages?.[0]) {
          const status = value.statuses[0];
          if (status.message_id) {
            const outboundMessage = await this.database.outboundMessage.findFirst({
              where: { organizationId: result.organizationId, externalMessageId: status.message_id },
              select: { id: true },
            });
            if (outboundMessage) {
              await this.reconcileQueue.publish({
                queue: "message.reconcile",
                outboundMessageId: outboundMessage.id,
                organizationId: result.organizationId,
                externalEventId: result.eventId,
                status: status.status ?? "unknown",
              });
            }
          }
        } else {
          await this.normalizeQueue.publish({ webhookEventId: result.eventId, organizationId: result.organizationId });
        }
      } catch {
        await this.normalizeQueue.publish({ webhookEventId: result.eventId, organizationId: result.organizationId });
      }
    }
    return result;
  }
}
