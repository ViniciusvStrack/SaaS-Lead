import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifiesChallenge, verifySignature } from "../src/webhook.ts";

test("returns the challenge only when mode and verify token match", () => {
  const query = {
    "hub.mode": "subscribe",
    "hub.verify_token": "known-token",
    "hub.challenge": "challenge-123",
  };

  assert.equal(verifiesChallenge(query, "known-token"), "challenge-123");
});

test("rejects challenge when the verify token differs", () => {
  const query = {
    "hub.mode": "subscribe",
    "hub.verify_token": "wrong-token",
    "hub.challenge": "challenge-123",
  };

  assert.throws(() => verifiesChallenge(query, "known-token"), /verification failed/i);
});

test("accepts an HMAC SHA-256 signature for the exact raw body", () => {
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}', "utf8");
  const digest = createHmac("sha256", "app-secret").update(rawBody).digest("hex");

  assert.equal(verifySignature(rawBody, `sha256=${digest}`, "app-secret"), true);
});

test("rejects the signature when the raw body changes", () => {
  const original = Buffer.from('{"value":1}', "utf8");
  const changed = Buffer.from('{"value":2}', "utf8");
  const digest = createHmac("sha256", "app-secret").update(original).digest("hex");

  assert.equal(verifySignature(changed, `sha256=${digest}`, "app-secret"), false);
});

test("rejects a missing signature", () => {
  assert.equal(verifySignature(Buffer.from("{}"), undefined, "app-secret"), false);
});
