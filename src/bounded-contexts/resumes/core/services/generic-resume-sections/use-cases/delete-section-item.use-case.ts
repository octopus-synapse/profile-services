import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import { SectionTypePolicy } from '../policies/section-type.policy';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';
import { publishSectionContentChange } from './publish-section-content-change';

export class DeleteSectionItemUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
    private readonly sectionTypePolicy: SectionTypePolicy,
    private readonly eventPublisher?: ResumeEventPublisher,
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
      throw new EntityNotFoundException('SectionItem', itemId);
    }

    await this.repository.deleteSectionItem(itemId);
    publishSectionContentChange(this.eventPublisher, resumeId, userId, sectionType.semanticKind);
  }
}
