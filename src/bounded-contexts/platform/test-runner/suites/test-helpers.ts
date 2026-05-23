import type { LoggerPort } from '@/shared-kernel';
import type { TestResult } from '../domain/ports/test-suite-runner.port';

const CTX = 'TestRunnerService';

/**
 * Wraps a single test step so its assertions can use plain JS Error throws.
 * The bare error throws inside per-suite functions are intentional internal
 * test assertions: they're caught here and converted into a `TestResult`
 * whose `detail` field surfaces the message in the suite report. They never
 * propagate to the HTTP layer.
 */
export async function runTest(
  name: string,
  fn: () => Promise<string>,
  logger: LoggerPort,
): Promise<TestResult> {
  const start = performance.now();
  try {
    const detail = await fn();
    return { name, pass: true, detail, durationMs: Math.round(performance.now() - start) };
  } catch (err) {
    const detail = String(err instanceof Error ? err.message : err);
    logger.warn(`Test "${name}" failed: ${detail}`, CTX);
    return { name, pass: false, detail, durationMs: Math.round(performance.now() - start) };
  }
}
