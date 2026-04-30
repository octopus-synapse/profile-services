import { AdminTechAreasRepositoryPort } from '../../../domain/ports/admin-tech-areas.repository.port';

export class CreateAdminTechAreaUseCase {
  constructor(private readonly repository: AdminTechAreasRepositoryPort) {}

  execute(input: Record<string, unknown>) {
    return this.repository.create(input);
  }
}
