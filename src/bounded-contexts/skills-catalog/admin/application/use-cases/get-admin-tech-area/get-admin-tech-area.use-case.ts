import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechAreasRepositoryPort } from '../../../domain/ports/admin-tech-areas.repository.port';

export class GetAdminTechAreaUseCase {
  constructor(private readonly repository: AdminTechAreasRepositoryPort) {}

  async execute(id: string) {
    const item = await this.repository.findOne(id);
    if (!item) throw new EntityNotFoundException('TechArea', id);
    return item;
  }
}
