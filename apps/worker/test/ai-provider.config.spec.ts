import { describe, expect, it } from "vitest";

import { RuleBasedAnalysisProvider } from "@saas-lead/ai";

import { createAnalysisProvider, loadAiProviderSettings } from "../src/ai-provider.config.js";

describe("loadAiProviderSettings", () => {
  it("falls back to deterministic rules when no OpenAI key is configured", () => {
    const settings = loadAiProviderSettings({});

    expect(settings).toMatchObject({
      mode: "rules",
      model: "local-rules.v1",
      promptVersion: "conversation-analysis.v1",
      timeoutMs: 30_000,
    });
    expect(settings.apiKey).toBeUndefined();
  });

  it("selects OpenAI when an API key is present", () => {
    const settings = loadAiProviderSettings({ OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "configured-model" });

    expect(settings).toMatchObject({ mode: "openai", model: "configured-model", apiKey: "sk-test" });
  });

  it("keeps an explicit rules override even when a key exists", () => {
    const settings = loadAiProviderSettings({ AI_PROVIDER: "rules", OPENAI_API_KEY: "sk-test" });

    expect(settings.mode).toBe("rules");
  });

  it("fails fast when OpenAI mode has no API key", () => {
    expect(() => loadAiProviderSettings({ AI_PROVIDER: "openai", OPENAI_MODEL: "configured-model" })).toThrow(
      "OPENAI_API_KEY",
    );
  });

  it("fails fast when OpenAI mode has no model", () => {
    expect(() => loadAiProviderSettings({ AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" })).toThrow(
      "OPENAI_MODEL",
    );
  });

  it("rejects an unknown provider mode", () => {
    expect(() => loadAiProviderSettings({ AI_PROVIDER: "magic" })).toThrow("AI_PROVIDER");
  });

  it("rejects a non-positive timeout", () => {
    expect(() => loadAiProviderSettings({ OPENAI_TIMEOUT_MS: "0" })).toThrow("OPENAI_TIMEOUT_MS");
    expect(() => loadAiProviderSettings({ OPENAI_TIMEOUT_MS: "abc" })).toThrow("OPENAI_TIMEOUT_MS");
  });
});

describe("createAnalysisProvider", () => {
  it("builds the deterministic rules provider by default", () => {
    const runtime = createAnalysisProvider(loadAiProviderSettings({}));

    expect(runtime.provider).toBeInstanceOf(RuleBasedAnalysisProvider);
    expect(runtime.providerName).toBe("local-rules");
  });

  it("builds the OpenAI provider without performing network calls", () => {
    const runtime = createAnalysisProvider(
      loadAiProviderSettings({ OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "configured-model" }),
    );

    expect(runtime.providerName).toBe("openai");
    expect(runtime.model).toBe("configured-model");
    expect(runtime.promptVersion).toBe("conversation-analysis.v1");
  });
});
