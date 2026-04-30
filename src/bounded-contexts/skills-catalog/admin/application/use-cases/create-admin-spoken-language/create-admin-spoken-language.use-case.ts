import { AdminSpokenLanguagesRepositoryPort } from '../../../domain/ports/admin-spoken-languages.repository.port';

export class CreateAdminSpokenLanguageUseCase {
  constructor(private readonly repository: AdminSpokenLanguagesRepositoryPort) {}

  execute(input: Record<string, unknown>) {
    return this.repository.create(input);
  }
}
