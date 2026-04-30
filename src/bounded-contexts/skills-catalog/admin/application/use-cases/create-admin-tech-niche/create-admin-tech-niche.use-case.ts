import { AdminTechNichesRepositoryPort } from '../../../domain/ports/admin-tech-niches.repository.port';

export class CreateAdminTechNicheUseCase {
  constructor(private readonly repository: AdminTechNichesRepositoryPort) {}

  execute(input: Record<string, unknown>) {
    return this.repository.create(input);
  }
}
