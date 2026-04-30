import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechNichesRepositoryPort } from '../../../domain/ports/admin-tech-niches.repository.port';

export class GetAdminTechNicheUseCase {
  constructor(private readonly repository: AdminTechNichesRepositoryPort) {}

  async execute(id: string) {
    const item = await this.repository.findOne(id);
    if (!item) throw new EntityNotFoundException('TechNiche', id);
    return item;
  }
}
