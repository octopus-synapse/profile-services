import { GithubApiPort } from './github-api.port';
import { type ParsedGithubProfile, parseGithubProfile } from './parse-github-profile';

export interface ImportGithubInput {
  token: string;
  username?: string;
  repoLimit?: number;
}

export class ImportGithubUseCase {
  constructor(private readonly api: GithubApiPort) {}

  async execute(input: ImportGithubInput): Promise<ParsedGithubProfile> {
    const user = await this.api.getUser(input.token, input.username);
    const repos = await this.api.listRepositories(input.token, user.login, {
      limit: input.repoLimit ?? 50,
    });
    return parseGithubProfile(user, repos);
  }
}
