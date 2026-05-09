import { AdminProgrammingLanguagesRepositoryPort } from '../../../domain/ports/admin-programming-languages.repository.port';
import { assertValidProgrammingLanguageInput } from '../../../domain/validators/admin-input.validators';

export class CreateAdminProgrammingLanguageUseCase {
  constructor(private readonly repository: AdminProgrammingLanguagesRepositoryPort) {}

  async execute(input: Record<string, unknown>) {
    assertValidProgrammingLanguageInput(input);
    return this.repository.create(input);
  }
}
