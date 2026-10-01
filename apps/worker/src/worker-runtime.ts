export type QueueHandler = (data: unknown) => Promise<unknown>;
export type SafeWorkerError = { queue: string; errorType: string };
export interface QueueWorker { close(): Promise<void>; onError(listener: (error: Error) => void): void }
export type QueueWorkerFactory = (queue: string, process: QueueHandler) => QueueWorker;

export class WorkerRuntime {
  private workers: QueueWorker[] = [];
  private started = false;
  private closed = false;

  constructor(
    private readonly factory: QueueWorkerFactory,
    private readonly handlers: Readonly<Record<string, QueueHandler>>,
    private readonly logError: (entry: SafeWorkerError) => void = () => undefined,
  ) {}

  start() {
    if (this.started) return;
    this.started = true;
    for (const [queue, handler] of Object.entries(this.handlers)) {
      const worker = this.factory(queue, handler);
      worker.onError((error) => this.logError({ queue, errorType: error.name || "Error" }));
      this.workers.push(worker);
    }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
}
