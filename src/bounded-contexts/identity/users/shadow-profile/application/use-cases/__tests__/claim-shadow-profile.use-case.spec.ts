import { beforeEach, describe, expect, it } from 'bun:test';
import { ApplyShadowPayloadToUserPolicy } from '../../../domain/rules/apply-shadow-payload-to-user.policy';
import {
  ShadowProfileAlreadyClaimedException,
  ShadowProfileNotFoundException,
} from '../../../shadow-profile.exceptions';
import { InMemoryShadowProfileRepository } from '../../../testing/in-memory-shadow-profile.repository';
import type {
  CreatePrimaryResumeInput,
  ResumeMergeView,
} from '../../ports/user-resume-shadow-apply.port';
import { UserResumeShadowApplyPort } from '../../ports/user-resume-shadow-apply.port';
import { ClaimShadowProfileUseCase } from '../claim-shadow-profile.use-case';

class InMemoryUserResumeApply extends UserResumeShadowApplyPort {
  primaryResumeIdByUser = new Map<string, string>();
  resumesById = new Map<string, ResumeMergeView>();
  createdResumes: Array<{ userId: string; input: CreatePrimaryResumeInput }> = [];
  patchedResumes: Array<{
    resumeId: string;
    patch: { primaryStack: string[]; jobTitle: string | null };
  }> = [];
  private nextResumeId = 1;

  async findUserPrimaryResumeId(userId: string) {
    return this.primaryResumeIdByUser.get(userId) ?? null;
  }
  async findResumeForMerge(resumeId: string) {
    return this.resumesById.get(resumeId) ?? null;
  }
  async patchResume(resumeId: string, patch: { primaryStack: string[]; jobTitle: string | null }) {
    this.patchedResumes.push({ resumeId, patch });
    this.resumesById.set(resumeId, patch);
  }
  async createPrimaryResume(userId: string, input: CreatePrimaryResumeInput) {
    const id = `resume-${this.nextResumeId++}`;
    this.createdResumes.push({ userId, input });
    this.resumesById.set(id, { primaryStack: input.primaryStack, jobTitle: input.jobTitle });
    return id;
  }
  async setUserPrimaryResume(userId: string, resumeId: string) {
    this.primaryResumeIdByUser.set(userId, resumeId);
  }
}

describe('ClaimShadowProfileUseCase', () => {
  let repository: InMemoryShadowProfileRepository;
  let applyPort: InMemoryUserResumeApply;
  let useCase: ClaimShadowProfileUseCase;

  beforeEach(() => {
    repository = new InMemoryShadowProfileRepository();
    applyPort = new InMemoryUserResumeApply();
    useCase = new ClaimShadowProfileUseCase(
      repository,
      new ApplyShadowPayloadToUserPolicy(applyPort),
    );
  });

  it('throws ShadowProfileNotFoundException when the id does not exist', async () => {
    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(
      ShadowProfileNotFoundException,
    );
  });

  it('throws ShadowProfileAlreadyClaimedException when another user already owns it', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: null,
      payload: { headline: 'engineer', primaryStack: ['ts'] },
      claimedByUserId: 'user-other',
    });

    await expect(useCase.execute('shadow-1', 'user-1')).rejects.toThrow(
      ShadowProfileAlreadyClaimedException,
    );
  });

  it('creates a primary resume and marks the shadow profile claimed when the user has no resume', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: null,
      payload: { headline: 'TypeScript engineer', primaryStack: ['ts', 'node'] },
      claimedByUserId: null,
    });

    const claimed = await useCase.execute('shadow-1', 'user-1');

    expect(claimed.claimedByUserId).toBe('user-1');
    expect(applyPort.createdResumes).toHaveLength(1);
    expect(applyPort.createdResumes[0]?.input).toEqual({
      title: 'My resume',
      primaryStack: ['ts', 'node'],
      jobTitle: 'TypeScript engineer',
    });
    expect(applyPort.primaryResumeIdByUser.get('user-1')).toBeDefined();
  });

  it('merges primary stack into the existing resume without clobbering custom job title', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: null,
      payload: { headline: 'auto-detected', primaryStack: ['rust'] },
      claimedByUserId: null,
    });
    applyPort.primaryResumeIdByUser.set('user-1', 'resume-existing');
    applyPort.resumesById.set('resume-existing', {
      primaryStack: ['ts', 'node'],
      jobTitle: 'Custom title set by user',
    });

    await useCase.execute('shadow-1', 'user-1');

    expect(applyPort.patchedResumes).toHaveLength(1);
    expect(applyPort.patchedResumes[0]?.patch.primaryStack.sort()).toEqual(
      ['ts', 'node', 'rust'].sort(),
    );
    expect(applyPort.patchedResumes[0]?.patch.jobTitle).toBe('Custom title set by user');
  });

  it('lets the same user re-claim their own shadow profile (idempotent)', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: null,
      payload: { headline: 'engineer', primaryStack: ['ts'] },
      claimedByUserId: 'user-1',
    });

    const result = await useCase.execute('shadow-1', 'user-1');
    expect(result.claimedByUserId).toBe('user-1');
  });
});
