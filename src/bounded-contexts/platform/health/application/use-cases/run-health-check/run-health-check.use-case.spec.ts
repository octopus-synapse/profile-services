import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryHealthCheckOrchestrator } from '../../../testing';
import { RunHealthCheckUseCase } from './run-health-check.use-case';

describe('RunHealthCheckUseCase', () => {
  let orchestrator: InMemoryHealthCheckOrchestrator;
  let useCase: RunHealthCheckUseCase;

  beforeEach(() => {
    orchestrator = new InMemoryHealthCheckOrchestrator();
    useCase = new RunHealthCheckUseCase(orchestrator);
  });

  it('asks for the full system list when none is provided', async () => {
    orchestrator.seedSnapshot({ status: 'ok' });

    await useCase.execute();

    expect(orchestrator.calls[0]).toEqual([
      'database',
      'redis',
      'storage',
      'translate',
      'smtp',
      'openai',
    ]);
  });

  it('forwards the requested subset to the orchestrator', async () => {
    orchestrator.seedSnapshot({ status: 'ok' });

    await useCase.execute(['database', 'redis']);

    expect(orchestrator.calls[0]).toEqual(['database', 'redis']);
  });

  it('returns whatever snapshot the orchestrator produces', async () => {
    const snapshot = {
      status: 'error',
      error: { redis: { status: 'down', message: 'connection refused' } },
    };
    orchestrator.seedSnapshot(snapshot);

    const result = await useCase.execute(['redis']);

    expect(result).toEqual(snapshot);
  });
});
