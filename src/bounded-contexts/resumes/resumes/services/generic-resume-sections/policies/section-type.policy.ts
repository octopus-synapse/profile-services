import { NotFoundException } from '@nestjs/common';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class SectionTypePolicy {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  async getActive(sectionTypeKey: string) {
    const sectionType = await this.repository.findActiveSectionTypeByKey(sectionTypeKey);

    if (!sectionType) {
      throw new NotFoundException('Section type not found');
    }

    return sectionType;
  }
}
