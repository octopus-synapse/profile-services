import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';

export class GetSemanticKindsUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(): Promise<string[]> {
    return this.repository.findDistinctSemanticKinds();
  }
}
