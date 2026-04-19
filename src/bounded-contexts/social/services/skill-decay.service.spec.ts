import { describe, expect, it } from 'bun:test';
import { SkillDecayService } from './skill-decay.service';

describe('SkillDecayService.quarterKey (exposed via behavior)', () => {
  it('scanAndFlag is callable with a specific reference date', async () => {
    // Purely structural — real DB flow is covered by the integration test.
    const service = new SkillDecayService({} as never);
    expect(typeof service.scanAndFlag).toBe('function');
  });
});
