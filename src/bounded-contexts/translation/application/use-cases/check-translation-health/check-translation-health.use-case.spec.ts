/**
 * Check Translation Health Use Case Tests
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { CheckTranslationHealthUseCase } from './check-translation-health.use-case';

describe('CheckTranslationHealthUseCase', () => {
  let useCase: CheckTranslationHealthUseCase;
  let fakeTranslationService: {
    checkServiceHealth: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    fakeTranslationService = {
      checkServiceHealth: mock(() => Promise.resolve(true)),
    };

    useCase = new CheckTranslationHealthUseCase(fakeTranslationService as never);
  });

  it('should return true when service is healthy', async () => {
    const result = await useCase.execute();

    expect(fakeTranslationService.checkServiceHealth).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return false when service is unhealthy', async () => {
    fakeTranslationService.checkServiceHealth.mockResolvedValue(false);

    const result = await useCase.execute();

    expect(result).toBe(false);
  });
});
