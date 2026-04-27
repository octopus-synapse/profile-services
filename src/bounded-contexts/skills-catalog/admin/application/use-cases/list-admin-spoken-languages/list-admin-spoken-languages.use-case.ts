import {
  type AdminSpokenLanguagesListQuery,
  AdminSpokenLanguagesRepositoryPort,
} from '../../../domain/ports/admin-spoken-languages.repository.port';

export class ListAdminSpokenLanguagesUseCase {
  constructor(private readonly repository: AdminSpokenLanguagesRepositoryPort) {}

  execute(query: AdminSpokenLanguagesListQuery) {
    return this.repository.findAll(query);
  }
}
