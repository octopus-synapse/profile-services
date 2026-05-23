import type {
  CreatePrimaryResumeInput,
  UserResumeShadowApplyPort,
} from '../../application/ports/user-resume-shadow-apply.port';

export interface ShadowPayloadShape {
  readonly headline?: string | null;
  readonly primaryStack?: readonly string[];
  readonly projects?: ReadonlyArray<{ name: string; url: string; summary: string }>;
}

export class ApplyShadowPayloadToUserPolicy {
  constructor(private readonly applyPort: UserResumeShadowApplyPort) {}

  async apply(userId: string, payload: ShadowPayloadShape): Promise<void> {
    const stack = (payload.primaryStack ?? []).filter(
      (s): s is string => typeof s === 'string' && s.length > 0,
    );
    const headline = typeof payload.headline === 'string' ? payload.headline : null;

    const primaryResumeId = await this.applyPort.findUserPrimaryResumeId(userId);

    if (primaryResumeId) {
      const existing = await this.applyPort.findResumeForMerge(primaryResumeId);
      const merged = Array.from(new Set([...(existing?.primaryStack ?? []), ...stack]));
      await this.applyPort.patchResume(primaryResumeId, {
        primaryStack: merged,
        jobTitle: existing?.jobTitle ?? headline,
      });
      return;
    }

    const newResume: CreatePrimaryResumeInput = {
      title: 'My resume',
      primaryStack: stack,
      jobTitle: headline,
    };
    const createdId = await this.applyPort.createPrimaryResume(userId, newResume);
    await this.applyPort.setUserPrimaryResume(userId, createdId);
  }
}
