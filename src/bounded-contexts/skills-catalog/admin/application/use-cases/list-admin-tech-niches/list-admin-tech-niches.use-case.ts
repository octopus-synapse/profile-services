import {
  type AdminTechNichesListQuery,
  AdminTechNichesRepositoryPort,
} from '../../../domain/ports/admin-tech-niches.repository.port';

export class ListAdminTechNichesUseCase {
  constructor(private readonly repository: AdminTechNichesRepositoryPort) {}

  execute(query: AdminTechNichesListQuery) {
    return this.repository.listAll(query);
  }
}
