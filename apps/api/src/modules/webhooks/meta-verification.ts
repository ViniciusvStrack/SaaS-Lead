export function verifyMetaChallenge(query: Record<string, string | undefined>, expectedToken: string): string {
  if (query["hub.mode"] !== "subscribe" || query["hub.verify_token"] !== expectedToken || !query["hub.challenge"]) {
    throw new Error("Webhook verification failed");
  }
  return query["hub.challenge"];
}
