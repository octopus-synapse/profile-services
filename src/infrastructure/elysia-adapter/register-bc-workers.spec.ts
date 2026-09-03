import { describe, expect, it, mock } from 'bun:test';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { NoopJobQueueAdapter } from './noop-job-queue.adapter';
import { registerBcWorkers } from './register-bc-workers';

function makeLogger(): LoggerPort & { warnings: string[]; logs: string[] } {
  const warnings: string[] = [];
  const logs: string[] = [];
  return {
    warnings,
    logs,
    log: (msg: string) => void logs.push(msg),
    warn: (msg: string) => void warnings.push(msg),
    error: () => {},
    debug: () => {},
    verbose: () => {},
  } as unknown as LoggerPort & { warnings: string[]; logs: string[] };
}

const process = async (): Promise<void> => {};

describe('registerBcWorkers', () => {
  it('registers every ungated binding of every owner against the queue', async () => {
    const queue = new NoopJobQueueAdapter();
    const register = mock(queue.register.bind(queue));
    queue.register = register;
    const flags = { isEnabled: mock(async () => true) };

    const result = await registerBcWorkers({ queue, flags, logger: makeLogger() }, [
      { name: 'a', workers: [{ queue: 'q1', process }] },
      {
        name: 'b',
        workers: [
          { queue: 'q2', process },
          { queue: 'q3', process },
        ],
      },
      { name: 'c' },
    ]);

    expect(register.mock.calls.map((c) => c[0])).toEqual(['q1', 'q2', 'q3']);
    expect(flags.isEnabled).not.toHaveBeenCalled();
    expect(result.every((r) => r.status === 'consuming')).toBe(true);
  });

  it('leaves a binding inert when its flag is off and says so once', async () => {
    const queue = new NoopJobQueueAdapter();
    const register = mock(queue.register.bind(queue));
    queue.register = register;
    const logger = makeLogger();
    const flags = { isEnabled: mock(async (key: string) => key !== 'automation.enabled') };

    const result = await registerBcWorkers({ queue, flags, logger }, [
      {
        name: 'automation',
        workers: [
          { queue: 'auto-apply', process, enabledWhen: 'automation.enabled' },
          { queue: 'weekly-curated', process, enabledWhen: 'automation.enabled' },
        ],
      },
      { name: 'other', workers: [{ queue: 'live', process, enabledWhen: 'other.enabled' }] },
    ]);

    expect(register.mock.calls.map((c) => c[0])).toEqual(['live']);
    expect(result).toEqual([
      { owner: 'automation', queue: 'auto-apply', status: 'inert', gatedBy: 'automation.enabled' },
      {
        owner: 'automation',
        queue: 'weekly-curated',
        status: 'inert',
        gatedBy: 'automation.enabled',
      },
      { owner: 'other', queue: 'live', status: 'consuming', gatedBy: 'other.enabled' },
    ]);
    const inertLines = logger.warnings.filter((w) => w.includes('INERT'));
    expect(inertLines).toHaveLength(2);
    expect(inertLines[0]).toContain('"auto-apply"');
    expect(inertLines[0]).toContain('automation.enabled');
  });

  it('fails closed when the flag cannot be evaluated', async () => {
    const queue = new NoopJobQueueAdapter();
    const register = mock(queue.register.bind(queue));
    queue.register = register;
    const flags = {
      isEnabled: async () => {
        throw new Error('redis down');
      },
    };

    const result = await registerBcWorkers({ queue, flags, logger: makeLogger() }, [
      { name: 'x', workers: [{ queue: 'gated', process, enabledWhen: 'x.enabled' }] },
    ]);

    expect(register).not.toHaveBeenCalled();
    expect(result[0]?.status).toBe('inert');
  });
});
