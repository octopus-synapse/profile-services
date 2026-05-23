import { AdminTechNichesRepositoryPort } from '../../../domain/ports/admin-tech-niches.repository.port';
import { assertValidTechNicheInput } from '../../../domain/validators/admin-input.validators';

export class CreateAdminTechNicheUseCase {
  constructor(private readonly repository: AdminTechNichesRepositoryPort) {}

  async execute(input: Record<string, unknown>) {
    assertValidTechNicheInput(input);
    return this.repository.create(input);
  }
}
