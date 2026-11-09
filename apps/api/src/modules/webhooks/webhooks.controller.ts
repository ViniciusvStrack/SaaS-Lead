import { Controller, Get, Headers, HttpCode, Inject, Post, Query, Req, Res } from "@nestjs/common";
import { verifyMetaChallenge } from "./meta-verification.js";
import { WebhookInbox, type AcceptResult } from "./webhook-inbox.js";
import type { NormalizeQueuePublisher } from "./webhook-normalize.publisher.js";

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
    // Publish for accepted deliveries (including duplicates): the deterministic
    // job id de-duplicates, and re-publishing recovers events whose first enqueue
    // failed after the row was persisted. A rejected delivery must never enqueue.
    if (result.accepted) {
      await this.normalizeQueue.publish({ webhookEventId: result.eventId, organizationId: result.organizationId });
    }
    return result;
  }
}
