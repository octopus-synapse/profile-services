import { describe, expect, it } from 'bun:test';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { CronerCronAdapter } from './croner-cron.adapter';

interface LoggerCall {
  level: string;
  message: string;
  meta: unknown;
}

function buildSpyLogger(): { logger: LoggerPort; calls: LoggerCall[] } {
  const calls: LoggerCall[] = [];
  const logger = {
    log: () => {},
    error: (message: string, meta: unknown) => {
      calls.push({ level: 'error', message, meta });
    },
    warn: () => {},
    debug: () => {},
    verbose: () => {},
  } as unknown as LoggerPort;
  return { logger, calls };
}

describe('CronerCronAdapter (P1 #43)', () => {
  it('awaits the handler and logs an error when it throws', async () => {
    const { logger, calls } = buildSpyLogger();
    const adapter = new CronerCronAdapter(logger);

    // We exercise the inner handler directly by registering a job and
    // pulling out the wrapped callback via croner's `.trigger()` (manual fire).
    const failure = new Error('boom');
    adapter.register({ pattern: '* * * * *' }, async () => {
      throw failure;
    });

    // Access the croner Cron instance and trigger immediately.
    const job = (adapter as unknown as { jobs: Array<{ trigger: () => Promise<void> }> }).jobs[0];
    await job.trigger();

    await adapter.dispose();

    expect(calls).toHaveLength(1);
    expect(calls[0].message).toContain('boom');
    expect((calls[0].meta as { context: string }).context).toBe('CronerCronAdapter');
  });

  it('defaults the timezone to UTC and enables overlap protection when no tz is supplied', async () => {
    const adapter = new CronerCronAdapter();
    adapter.register({ pattern: '* * * * *' }, async () => {});
    const job = (
      adapter as unknown as {
        jobs: Array<{ options: { timezone?: string; protect?: boolean | unknown } }>;
      }
    ).jobs[0];
    expect(job.options.timezone).toBe('UTC');
    expect(job.options.protect).toBe(true);
    await adapter.dispose();
  });
});
