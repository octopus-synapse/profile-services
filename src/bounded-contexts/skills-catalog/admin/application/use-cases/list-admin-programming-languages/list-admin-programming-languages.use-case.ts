import {
  type AdminProgrammingLanguagesListQuery,
  AdminProgrammingLanguagesRepositoryPort,
} from '../../../domain/ports/admin-programming-languages.repository.port';

export class ListAdminProgrammingLanguagesUseCase {
  constructor(private readonly repository: AdminProgrammingLanguagesRepositoryPort) {}

  execute(query: AdminProgrammingLanguagesListQuery) {
    return this.repository.listAll(query);
  }
}
