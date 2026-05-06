import type { LoggerPort } from '@/shared-kernel';
import { buildShadowPayload, ShadowPayloadSchema } from '../../build-shadow-payload';
import type { ShadowGithubApi } from '../../ports/github-api.port';
import type { ShadowProfileSnapshot } from '../ports/shadow-profile-repository.port';
import { ShadowProfileRepositoryPort } from '../ports/shadow-profile-repository.port';
import {
  type UpsertShadowGithubInput,
  UpsertShadowGithubUseCasePort,
} from '../ports/upsert-shadow-github.use-case.port';

export class UpsertShadowGithubUseCase extends UpsertShadowGithubUseCasePort {
  constructor(
    private readonly repository: ShadowProfileRepositoryPort,
    private readonly github: ShadowGithubApi,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async execute(input: UpsertShadowGithubInput): Promise<ShadowProfileSnapshot> {
    const user = await this.github.getUser(input.token, input.username);
    const repos = await this.github.listRepositories(input.token, user.login, { limit: 50 });
    const payload = ShadowPayloadSchema.parse(buildShadowPayload(user, repos));

    const snapshot = await this.repository.upsert({
      source: 'github',
      externalHandle: user.login,
      contactEmail: null,
      payload,
    });
    this.logger?.log(
      `Shadow profile upserted for github:${user.login}`,
      'UpsertShadowGithubUseCase',
    );
    return snapshot;
  }
}
