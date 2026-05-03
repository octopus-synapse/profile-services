import {
  SectionTypeInUseException,
  SystemSectionTypeUndeletableException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';

export class DeleteSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string): Promise<void> {
    const existing = await this.repository.findByKey(key);

    if (!existing) {
      throw new EntityNotFoundException('SectionType', key);
    }

    if (existing.isSystem) {
      throw new SystemSectionTypeUndeletableException();
    }

    const usageCount = await this.repository.countResumeSectionsForType(existing.id);

    if (usageCount > 0) {
      throw new SectionTypeInUseException(key, usageCount);
    }

    await this.repository.delete(key);
  }
}
