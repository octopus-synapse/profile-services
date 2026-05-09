import { AdminTechAreasRepositoryPort } from '../../../domain/ports/admin-tech-areas.repository.port';
import { assertValidTechAreaInput } from '../../../domain/validators/admin-input.validators';

export class CreateAdminTechAreaUseCase {
  constructor(private readonly repository: AdminTechAreasRepositoryPort) {}

  async execute(input: Record<string, unknown>) {
    assertValidTechAreaInput(input);
    return this.repository.create(input);
  }
}
