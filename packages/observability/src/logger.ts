import type { CorrelationContext } from "./correlation.js";

type Metadata = Record<string, unknown>;
type LogSink = (record: Metadata) => void;

export interface Logger {
  info(message: string, metadata?: Metadata): void;
}

const sensitiveKey = /(authorization|password|secret|token|apiKey)/i;

function redact(value: unknown, key?: string): unknown {
  if (key && sensitiveKey.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redact(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

export function createLogger(
  context: CorrelationContext,
  sink: LogSink = (record) => console.log(JSON.stringify(record)),
): Logger {
  return {
    info(message, metadata = {}) {
      sink(redact({ level: "info", message, ...context, ...metadata }) as Metadata);
    },
  };
}
