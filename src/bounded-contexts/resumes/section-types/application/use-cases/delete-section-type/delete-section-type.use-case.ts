import {
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';

export class DeleteSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string): Promise<void> {
    const existing = await this.repository.findByKey(key);

    if (!existing) {
      throw new EntityNotFoundException('SectionType', key);
    }

    if (existing.isSystem) {
      throw new ValidationException('Cannot delete system section types');
    }

    const usageCount = await this.repository.countResumeSectionsForType(existing.id);

    if (usageCount > 0) {
      throw new ValidationException(
        `Cannot delete section type '${key}' - it is used by ${usageCount} resume(s). ` +
          'Deactivate it instead.',
      );
    }

    await this.repository.delete(key);
  }
}
