import { AdminProgrammingLanguagesRepositoryPort } from '../../../domain/ports/admin-programming-languages.repository.port';

export class CreateAdminProgrammingLanguageUseCase {
  constructor(private readonly repository: AdminProgrammingLanguagesRepositoryPort) {}

  execute(input: Record<string, unknown>) {
    return this.repository.create(input);
  }
}
