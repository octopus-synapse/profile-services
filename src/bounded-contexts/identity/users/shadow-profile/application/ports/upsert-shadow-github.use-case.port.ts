import type { ShadowProfileSnapshot } from './shadow-profile-repository.port';

export interface UpsertShadowGithubInput {
  readonly token: string;
  readonly username: string;
}

export abstract class UpsertShadowGithubUseCasePort {
  abstract execute(input: UpsertShadowGithubInput): Promise<ShadowProfileSnapshot>;
}
