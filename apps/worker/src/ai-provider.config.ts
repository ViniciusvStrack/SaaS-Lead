import {
  FetchOpenAIResponseTransport,
  OpenAISuggestionProvider,
  OpenAIProvider,
  RuleBasedAnalysisProvider,
  RuleBasedSuggestionProvider,
  type AIProvider,
  type SuggestionProvider,
} from "@saas-lead/ai";

export type AiProviderMode = "rules" | "openai";

export interface AiProviderSettings {
  mode: AiProviderMode;
  model: string;
  promptVersion: string;
  timeoutMs: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface AnalysisRuntimeConfig {
  provider: AIProvider;
  providerName: string;
  model: string;
  promptVersion: string;
}

export interface SuggestionRuntimeConfig {
  provider: SuggestionProvider;
  providerName: string;
  model: string;
  promptVersion: string;
}

const DEFAULT_PROMPT_VERSION = "conversation-analysis.v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const RULES_MODEL = "local-rules.v1";

/**
 * Resolves which analysis provider the worker should use.
 *
 * - No configuration: deterministic rules (safe local default).
 * - `OPENAI_API_KEY` present: OpenAI Responses API (Structured Outputs).
 * - `AI_PROVIDER` always wins when set explicitly.
 *
 * Incomplete OpenAI configuration fails fast at startup instead of degrading
 * silently at job time.
 */
export function loadAiProviderSettings(env: Record<string, string | undefined>): AiProviderSettings {
  const configuredMode = env.AI_PROVIDER?.trim();
  const explicitMode: AiProviderMode | undefined =
    configuredMode === "rules" || configuredMode === "openai" ? configuredMode : undefined;
  if (configuredMode && !explicitMode) {
    throw new Error('AI_PROVIDER must be "rules" or "openai"');
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  const mode: AiProviderMode = explicitMode ?? (apiKey ? "openai" : "rules");

  if (mode === "openai" && !apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }

  const model = env.OPENAI_MODEL?.trim() ?? "";
  if (mode === "openai" && !model) {
    throw new Error("OPENAI_MODEL is required when AI_PROVIDER=openai");
  }

  const promptVersion = env.AI_PROMPT_VERSION?.trim() || DEFAULT_PROMPT_VERSION;
  const timeoutMs = parseTimeout(env.OPENAI_TIMEOUT_MS);
  const baseUrl = env.OPENAI_BASE_URL?.trim();

  return {
    mode,
    model: mode === "openai" ? model : RULES_MODEL,
    promptVersion,
    timeoutMs,
    ...(apiKey ? { apiKey } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  };
}

export function createAnalysisProvider(settings: AiProviderSettings): AnalysisRuntimeConfig {
  if (settings.mode === "rules") {
    return {
      provider: new RuleBasedAnalysisProvider(),
      providerName: "local-rules",
      model: settings.model,
      promptVersion: settings.promptVersion,
    };
  }

  if (!settings.apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }

  const transport = new FetchOpenAIResponseTransport({
    apiKey: settings.apiKey,
    ...(settings.baseUrl ? { baseUrl: settings.baseUrl } : {}),
  });

  return {
    provider: new OpenAIProvider({ model: settings.model, timeoutMs: settings.timeoutMs, transport }),
    providerName: "openai",
    model: settings.model,
    promptVersion: settings.promptVersion,
  };
}

export function createSuggestionProvider(settings: AiProviderSettings): SuggestionRuntimeConfig {
  if (settings.mode === "rules") {
    return {
      provider: new RuleBasedSuggestionProvider(),
      providerName: "local-rules",
      model: settings.model,
      promptVersion: settings.promptVersion,
    };
  }

  if (!settings.apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }

  const transport = new FetchOpenAIResponseTransport({
    apiKey: settings.apiKey,
    ...(settings.baseUrl ? { baseUrl: settings.baseUrl } : {}),
  });

  return {
    provider: new OpenAISuggestionProvider({ model: settings.model, timeoutMs: settings.timeoutMs, transport }),
    providerName: "openai",
    model: settings.model,
    promptVersion: settings.promptVersion,
  };
}

function parseTimeout(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("OPENAI_TIMEOUT_MS must be a positive integer");
  }
  return value;
}
