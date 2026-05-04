import type { LoggerPort } from '../logger/logger.port';

/**
 * Shutdown orchestration port.
 *
 * Q36 in the duplication audit. Lifecycle.dispose() was rarely
 * implemented and there was no documented orchestration for SIGTERM —
 * each composition was on its own. This port lets the bootstrap
 * register tasks and tear them down in a strategy-controlled order.
 */

export type ShutdownStrategy =
  /** Run every task concurrently; collect errors but never abort. */
  | 'PARALLEL'
  /** Run tasks one-at-a-time in registration order; abort on first error. */
  | 'SEQUENTIAL'
  /** Run concurrently; the first error rejects the whole shutdown. */
  | 'FAIL_FAST'
  /** Run concurrently; swallow errors after logging. */
  | 'BEST_EFFORT';

export interface ShutdownTask {
  readonly name: string;
  readonly run: () => Promise<void> | void;
  /** Optional per-task timeout (ms). Defaults to the orchestrator default. */
  readonly timeoutMs?: number;
}

export abstract class OnShutdownPort {
  abstract register(task: ShutdownTask): void;
  abstract shutdown(strategy?: ShutdownStrategy): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Default in-process implementation. Honours the strategy and the
 * per-task timeout. Logs every task transition so a stuck shutdown
 * shows up clearly in the SIGTERM logs.
 */
export class InProcessShutdownOrchestrator extends OnShutdownPort {
  private readonly tasks: ShutdownTask[] = [];

  constructor(
    private readonly logger?: LoggerPort,
    private readonly defaultTimeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    super();
  }

  register(task: ShutdownTask): void {
    this.tasks.push(task);
  }

  async shutdown(strategy: ShutdownStrategy = 'BEST_EFFORT'): Promise<void> {
    if (this.tasks.length === 0) return;

    this.logger?.log(
      `Starting shutdown of ${this.tasks.length} task(s) (strategy=${strategy})`,
      'OnShutdownPort',
    );

    if (strategy === 'SEQUENTIAL') {
      for (const task of this.tasks) {
        await this.runOne(task, /* failFast */ true);
      }
      return;
    }

    const wrapped = this.tasks.map((task) =>
      this.runOne(task, strategy === 'FAIL_FAST'),
    );
    if (strategy === 'FAIL_FAST') {
      await Promise.all(wrapped);
    } else {
      await Promise.allSettled(wrapped);
    }
  }

  private async runOne(task: ShutdownTask, failFast: boolean): Promise<void> {
    const timeoutMs = task.timeoutMs ?? this.defaultTimeoutMs;
    const startedAt = Date.now();
    try {
      await Promise.race([
        Promise.resolve(task.run()),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`shutdown task ${task.name} timed out after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);
      this.logger?.debug(
        `Shutdown task ${task.name} done in ${Date.now() - startedAt}ms`,
        'OnShutdownPort',
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      this.logger?.error(`Shutdown task ${task.name} failed: ${reason}`, {
        context: 'OnShutdownPort',
        stack: err instanceof Error ? err.stack : undefined,
      });
      if (failFast) throw err;
    }
  }
}
