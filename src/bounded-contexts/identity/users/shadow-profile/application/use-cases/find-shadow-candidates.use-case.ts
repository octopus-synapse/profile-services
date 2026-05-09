import { FindShadowCandidatesUseCasePort } from '../ports/find-shadow-candidates.use-case.port';
import {
  type FindShadowCandidatesInput,
  ShadowProfileRepositoryPort,
  type ShadowProfileSnapshot,
} from '../ports/shadow-profile-repository.port';

export class FindShadowCandidatesUseCase extends FindShadowCandidatesUseCasePort {
  constructor(private readonly repository: ShadowProfileRepositoryPort) {
    super();
  }

  async execute(input: FindShadowCandidatesInput): Promise<ShadowProfileSnapshot[]> {
    if (!input.email && !input.githubLogin) return [];
    return this.repository.findCandidates(input);
  }
}
