import { createConnection } from "node:net";
import type { DependencyProbe } from "./readiness.service.js";

type DialInput = { host: string; port: number; timeoutMs: number };
type Dial = (input: DialInput) => Promise<boolean>;

const defaultPorts: Record<string, number> = { "postgres:": 5432, "postgresql:": 5432, "redis:": 6379, "rediss:": 6379 };

const dialTcp: Dial = ({ host, port, timeoutMs }) => new Promise((resolve) => {
  const socket = createConnection({ host, port });
  let settled = false;
  const finish = (result: boolean) => {
    if (settled) return;
    settled = true;
    socket.destroy();
    resolve(result);
  };
  socket.setTimeout(timeoutMs);
  socket.once("connect", () => finish(true));
  socket.once("error", () => finish(false));
  socket.once("timeout", () => finish(false));
});

export function createConnectivityProbe(connectionUrl: string | undefined, dial: Dial = dialTcp): DependencyProbe {
  return async () => {
    try {
      if (!connectionUrl) return false;
      const parsed = new URL(connectionUrl);
      const defaultPort = defaultPorts[parsed.protocol];
      if (!parsed.hostname || (!parsed.port && !defaultPort)) return false;
      return dial({ host: parsed.hostname, port: parsed.port ? Number(parsed.port) : defaultPort!, timeoutMs: 2000 });
    } catch {
      return false;
    }
  };
}
