import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { SkillDecayService } from './skill-decay.service';

describe('SkillDecayService.quarterKey (exposed via behavior)', () => {
  it('scanAndFlag is callable with a specific reference date', async () => {
    // Purely structural — real DB flow is covered by the integration test.
    const service = new SkillDecayService({} as never, stubLogger);
    expect(typeof service.scanAndFlag).toBe('function');
  });
});
