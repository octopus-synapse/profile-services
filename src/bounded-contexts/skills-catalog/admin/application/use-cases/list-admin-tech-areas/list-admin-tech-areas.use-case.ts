import {
  type AdminTechAreasListQuery,
  AdminTechAreasRepositoryPort,
} from '../../../domain/ports/admin-tech-areas.repository.port';

export class ListAdminTechAreasUseCase {
  constructor(private readonly repository: AdminTechAreasRepositoryPort) {}

  execute(query: AdminTechAreasListQuery) {
    return this.repository.findAll(query);
  }
}
