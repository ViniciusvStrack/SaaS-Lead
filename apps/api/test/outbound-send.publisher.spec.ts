import { describe, expect, it } from "vitest";

import {
  BullMqSendQueue,
  messageSendQueue,
  sendJobId,
  type SendQueueLike,
} from "../src/modules/outbound/outbound-send.publisher.js";

const job = { queue: "message.send" as const, outboundMessageId: "out-1", organizationId: "org-a" };

describe("BullMqSendQueue", () => {
  it("usa jobId determinístico por tenant e mensagem", () => {
    expect(sendJobId(job)).toBe(sendJobId({ ...job }));
    expect(sendJobId(job)).not.toBe(sendJobId({ ...job, organizationId: "org-b" }));
    expect(sendJobId(job)).not.toBe(sendJobId({ ...job, outboundMessageId: "out-2" }));
  });

  it("publica na fila message.send com retries e prefixo do projeto", async () => {
    const calls: Array<{ name: string; data: unknown; options: Record<string, unknown> }> = [];
    const queue: SendQueueLike = {
      add: async (name, data, options) => {
        calls.push({ name, data, options });
      },
      close: async () => undefined,
    };
    const publisher = new BullMqSendQueue("redis://localhost:6379", queue);

    await publisher.publish(job);

    expect(calls).toEqual([
      {
        name: messageSendQueue,
        data: job,
        options: expect.objectContaining({
          jobId: sendJobId(job),
          attempts: 5,
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        }),
      },
    ]);
  });

  it("falha fechado sem REDIS_URL", () => {
    expect(() => new BullMqSendQueue("")).toThrow("REDIS_URL");
  });
});
