import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HealthCheckSystem } from '../../domain/ports/health-check-orchestrator.port';
import type { RunHealthCheckUseCase } from '../../application/use-cases/run-health-check/run-health-check.use-case';
import { HealthController } from './health.controller';

const okSnapshot = {
  status: 'ok',
  info: { database: { status: 'up' } },
  error: {},
  details: { database: { status: 'up' } },
};

function buildController() {
  const calls: HealthCheckSystem[][] = [];
  const useCase = {
    execute: mock(async (systems?: readonly HealthCheckSystem[]) => {
      calls.push(systems ? [...systems] : []);
      return okSnapshot;
    }),
  } as unknown as RunHealthCheckUseCase;
  return { controller: new HealthController(useCase), calls, useCase };
}

describe('HealthController', () => {
  let controller: HealthController;
  let calls: HealthCheckSystem[][];

  beforeEach(() => {
    ({ controller, calls } = buildController());
  });

  it('check() runs all systems', async () => {
    const result = await controller.check();
    expect(result.success).toBe(true);
    expect(result.data).toEqual(okSnapshot);
    expect(calls[0]).toEqual([]);
  });

  it.each([
    ['checkDatabase', 'database'],
    ['checkRedis', 'redis'],
    ['checkStorage', 'storage'],
    ['checkTranslate', 'translate'],
    ['checkSmtp', 'smtp'],
    ['checkOpenAI', 'openai'],
  ] as const)('%s requests only %s', async (method, system) => {
    await (controller as unknown as Record<string, () => Promise<unknown>>)[method]();
    expect(calls[0]).toEqual([system]);
  });
});
