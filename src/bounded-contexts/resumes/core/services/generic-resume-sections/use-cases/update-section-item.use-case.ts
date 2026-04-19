import type { Prisma } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ItemContentValidatorPolicy } from '../policies/item-content-validator.policy';
import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import { SectionTypePolicy } from '../policies/section-type.policy';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class UpdateSectionItemUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
    private readonly sectionTypePolicy: SectionTypePolicy,
    private readonly contentValidator: ItemContentValidatorPolicy,
  ) {}

  async execute(
    resumeId: string,
    sectionTypeKey: string,
    itemId: string,
    userId: string,
    content: Record<string, unknown>,
  ) {
    await this.ownershipPolicy.ensureOwned(resumeId, userId);

    const sectionType = await this.sectionTypePolicy.getActive(sectionTypeKey);
    const validatedContent = this.contentValidator.validate(sectionType.definition, content);

    const existingItem = await this.repository.findSectionItemForResumeAndType(
      itemId,
      resumeId,
      sectionType.id,
    );

    if (!existingItem) {
      throw new EntityNotFoundException('SectionItem', itemId);
    }

    return this.repository.updateSectionItem(itemId, validatedContent as Prisma.InputJsonValue);
  }
}
