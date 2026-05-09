export interface ResumeMergeView {
  readonly primaryStack: string[];
  readonly jobTitle: string | null;
}

export interface CreatePrimaryResumeInput {
  readonly title: string;
  readonly primaryStack: string[];
  readonly jobTitle: string | null;
}

export abstract class UserResumeShadowApplyPort {
  abstract findUserPrimaryResumeId(userId: string): Promise<string | null>;
  abstract findResumeForMerge(resumeId: string): Promise<ResumeMergeView | null>;
  abstract patchResume(
    resumeId: string,
    patch: { primaryStack: string[]; jobTitle: string | null },
  ): Promise<void>;
  abstract createPrimaryResume(userId: string, input: CreatePrimaryResumeInput): Promise<string>;
  abstract setUserPrimaryResume(userId: string, resumeId: string): Promise<void>;
}
