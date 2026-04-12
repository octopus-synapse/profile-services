import { NotFoundException } from '@nestjs/common';
import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import { SectionTypePolicy } from '../policies/section-type.policy';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class DeleteSectionItemUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
    private readonly sectionTypePolicy: SectionTypePolicy,
  ) {}

  async execute(
    resumeId: string,
    sectionTypeKey: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    await this.ownershipPolicy.ensureOwned(resumeId, userId);
    const sectionType = await this.sectionTypePolicy.getActive(sectionTypeKey);

    const existingItem = await this.repository.findSectionItemForResumeAndType(
      itemId,
      resumeId,
      sectionType.id,
    );

    if (!existingItem) {
      throw new NotFoundException('Section item not found');
    }

    await this.repository.deleteSectionItem(itemId);
  }
}
