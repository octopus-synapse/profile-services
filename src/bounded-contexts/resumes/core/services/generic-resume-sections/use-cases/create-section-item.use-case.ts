import type { Prisma } from '@prisma/client';
import type { ResumeEventPublisher } from '../../../../domain/ports';
import { ItemContentValidatorPolicy } from '../policies/item-content-validator.policy';
import { ItemLimitPolicy } from '../policies/item-limit.policy';
import { OrderingPolicy } from '../policies/ordering.policy';
import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import { SectionTypePolicy } from '../policies/section-type.policy';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';
import { publishSectionContentChange } from './publish-section-content-change';

export class CreateSectionItemUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
    private readonly contentValidator: ItemContentValidatorPolicy,
    private readonly eventPublisher?: ResumeEventPublisher,
  ) {}

  async execute(
    resumeId: string,
    sectionTypeKey: string,
    userId: string,
    content: Record<string, unknown>,
  ) {
    await this.ownershipPolicy.ensureOwned(resumeId, userId);

    const { item, semanticKind } = await this.repository.runInTransaction(
      async (transactionRepository) => {
        const sectionTypePolicy = new SectionTypePolicy(transactionRepository);
        const itemLimitPolicy = new ItemLimitPolicy(transactionRepository);
        const orderingPolicy = new OrderingPolicy(transactionRepository);

        const sectionType = await sectionTypePolicy.getActive(sectionTypeKey);
        const validatedContent = this.contentValidator.validate(sectionType.definition, content);

        const existingResumeSection = await transactionRepository.findResumeSection(
          resumeId,
          sectionType.id,
        );

        let resumeSection = existingResumeSection;
        if (!resumeSection) {
          const nextOrder = await orderingPolicy.nextSectionOrder(resumeId);
          resumeSection = await transactionRepository.createResumeSection(
            resumeId,
            sectionType.id,
            nextOrder,
          );
        }

        const definitionConstraints = itemLimitPolicy.extractDefinitionConstraints(
          sectionType.definition,
        );
        const effectiveMaxItems = itemLimitPolicy.resolveMaxItems(
          sectionType.maxItems,
          definitionConstraints.allowsMultipleItems,
          definitionConstraints.maxItems,
        );

        await itemLimitPolicy.ensureWithinLimit(resumeSection.id, effectiveMaxItems);

        const nextItemOrder = await orderingPolicy.nextItemOrder(resumeSection.id);

        const item = await transactionRepository.createSectionItem(
          resumeSection.id,
          nextItemOrder,
          validatedContent as Prisma.InputJsonValue,
        );
        return { item, semanticKind: sectionType.semanticKind };
      },
    );

    publishSectionContentChange(this.eventPublisher, resumeId, userId, semanticKind);
    return item;
  }
}
