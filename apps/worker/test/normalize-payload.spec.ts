import { describe, expect, it } from "vitest";
import { parseInboundPayload } from "../src/processors/prisma-conversation.store.js";

function payload(message: Record<string, unknown> | undefined) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: "5511999999999", profile: { name: "Cliente" } }],
              ...(message ? { messages: [message] } : { statuses: [{ id: "wamid-out", status: "delivered" }] }),
            },
          },
        ],
      },
    ],
  };
}

const base = { id: "wamid-1", from: "5511999999999", timestamp: "1760000000" };

describe("parseInboundPayload", () => {
  it("keeps text messages as-is", () => {
    expect(parseInboundPayload(payload({ ...base, type: "text", text: { body: "Olá" } }))).toMatchObject({
      messageId: "wamid-1",
      senderId: "5511999999999",
      senderName: "Cliente",
      body: "Olá",
    });
  });

  it.each([
    [{ type: "image", image: { caption: "Segue a foto" } }, "[imagem] Segue a foto"],
    [{ type: "image", image: {} }, "[imagem]"],
    [{ type: "video", video: { caption: "Tour da loja" } }, "[vídeo] Tour da loja"],
    [{ type: "document", document: { filename: "orcamento.pdf" } }, "[documento] orcamento.pdf"],
    [{ type: "audio", audio: { voice: true } }, "[áudio]"],
    [{ type: "sticker", sticker: { emoji: "😀" } }, "[figurinha]"],
    [{ type: "location", location: { name: "Loja Centro" } }, "[localização] Loja Centro"],
    [{ type: "button", button: { text: "Confirmar" } }, "[botão] Confirmar"],
    [{ type: "interactive", interactive: { list_reply: { title: "Ver planos" } } }, "[resposta] Ver planos"],
    [{ type: "reaction", reaction: { emoji: "👍" } }, "[reação] 👍"],
    [{ type: "order" }, "[order]"],
  ])("turns %j into a readable body", (extra, expected) => {
    expect(parseInboundPayload(payload({ ...base, ...extra }))?.body).toBe(expected);
  });

  it("ignores delivery-status payloads that carry no inbound message", () => {
    expect(parseInboundPayload(payload(undefined))).toBeUndefined();
  });

  it("rejects messages without a usable timestamp", () => {
    expect(parseInboundPayload(payload({ ...base, timestamp: undefined, type: "text", text: { body: "Olá" } }))).toBeUndefined();
  });
});
