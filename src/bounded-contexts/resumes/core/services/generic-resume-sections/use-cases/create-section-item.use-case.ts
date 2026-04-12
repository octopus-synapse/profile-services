import type { Prisma } from '@prisma/client';
import { ItemContentValidatorPolicy } from '../policies/item-content-validator.policy';
import { ItemLimitPolicy } from '../policies/item-limit.policy';
import { OrderingPolicy } from '../policies/ordering.policy';
import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import { SectionTypePolicy } from '../policies/section-type.policy';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class CreateSectionItemUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
    private readonly contentValidator: ItemContentValidatorPolicy,
  ) {}

  async execute(
    resumeId: string,
    sectionTypeKey: string,
    userId: string,
    content: Record<string, unknown>,
  ) {
    await this.ownershipPolicy.ensureOwned(resumeId, userId);

    return this.repository.runInTransaction(async (transactionRepository) => {
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

      return transactionRepository.createSectionItem(
        resumeSection.id,
        nextItemOrder,
        validatedContent as Prisma.InputJsonValue,
      );
    });
  }
}
