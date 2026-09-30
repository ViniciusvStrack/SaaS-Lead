import { createHmac, timingSafeEqual } from "node:crypto";

type VerificationQuery = Record<string, string | undefined>;

export function verifiesChallenge(
  query: VerificationQuery,
  expectedToken: string,
): string {
  const isValid =
    query["hub.mode"] === "subscribe" &&
    query["hub.verify_token"] === expectedToken &&
    typeof query["hub.challenge"] === "string";

  if (!isValid) {
    throw new Error("Webhook verification failed");
  }

  return query["hub.challenge"];
}

export function verifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  appSecret: string,
): boolean {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const providedHex = signature.slice("sha256=".length);
  if (!/^[a-f\d]{64}$/i.test(providedHex)) {
    return false;
  }

  const provided = Buffer.from(providedHex, "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
