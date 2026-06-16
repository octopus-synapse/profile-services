import { describe, expect, it } from 'bun:test';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes/domain/events';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { ComputeQualityUseCase } from '../../application/use-cases/compute-quality.use-case';
import { ResumeQualityOnResumeCreatedHandler } from './resume-quality-on-resume-created.handler';

function event(resumeId: string) {
  return new ResumeCreatedEvent(resumeId, { userId: 'u1', title: 'CV' });
}

describe('ResumeQualityOnResumeCreatedHandler', () => {
  it('computes the score once for the created resume', async () => {
    const calls: string[] = [];
    const compute = {
      execute: async (id: string) => {
        calls.push(id);
        return undefined as never;
      },
    } as unknown as Pick<ComputeQualityUseCase, 'execute'>;
    const handler = new ResumeQualityOnResumeCreatedHandler(compute, stubLogger);

    await handler.onResumeCreated(event('r1'));

    expect(calls).toEqual(['r1']);
  });

  it('swallows compute failures so resume creation is never blocked', async () => {
    const compute = {
      execute: async () => {
        throw new Error('openai down');
      },
    } as unknown as Pick<ComputeQualityUseCase, 'execute'>;
    const handler = new ResumeQualityOnResumeCreatedHandler(compute, stubLogger);

    await expect(handler.onResumeCreated(event('r1'))).resolves.toBeUndefined();
  });
});
