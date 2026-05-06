import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { SectionTypeResponseDto } from '../../../dto';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toSectionTypeResponseDto } from '../../../infrastructure/presenters/section-type.presenter';

export class GetSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string): Promise<SectionTypeResponseDto> {
    const sectionType = await this.repository.findByKey(key);

    if (!sectionType) {
      throw new EntityNotFoundException('SectionType', key);
    }

    return toSectionTypeResponseDto(sectionType);
  }
}
