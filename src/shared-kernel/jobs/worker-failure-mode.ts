import type { LoggerPort } from '../logger/logger.port';

/**
 * Worker failure mode declarations.
 *
 * Q37 in the duplication audit. Workers were swallowing or rethrowing
 * inconsistently — auto-apply rethrew (BullMQ retry), skill-decay
 * swallowed silently. This enum + helper makes the intent explicit at
 * the worker boundary.
 */
export type WorkerFailureMode =
  /** Rethrow so the job queue re-attempts (BullMQ standard). */
  | 'RETRY'
  /** Log + swallow; the worker loop continues on the next item. */
  | 'LOG_AND_CONTINUE'
  /** Rethrow synchronously so the worker process exits and supervisor restarts. */
  | 'FAIL_FAST';

export interface WorkerExecutionContext {
  readonly worker: string;
  readonly logger: LoggerPort;
}

/**
 * Wrap a worker run with the declared failure mode. Use at the
 * outermost layer of every worker:
 *
 *   await runWithFailureMode(
 *     { worker: 'SkillDecayWorker', logger: this.logger },
 *     'LOG_AND_CONTINUE',
 *     () => this.scan(),
 *   );
 */
export async function runWithFailureMode(
  ctx: WorkerExecutionContext,
  mode: WorkerFailureMode,
  run: () => Promise<void> | void,
): Promise<void> {
  try {
    await run();
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    ctx.logger.error(`Worker ${ctx.worker} failed: ${reason}`, {
      context: ctx.worker,
      stack: err instanceof Error ? err.stack : undefined,
      mode,
    });
    if (mode === 'RETRY' || mode === 'FAIL_FAST') {
      throw err;
    }
    // LOG_AND_CONTINUE: swallow.
  }
}
