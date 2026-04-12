import { BadRequestException } from '@nestjs/common';
import { SectionDefinitionSchema } from '@/shared-kernel/schemas/sections';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ItemLimitPolicy {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  extractDefinitionConstraints(definition: unknown) {
    const parsed = SectionDefinitionSchema.safeParse(definition);

    if (!parsed.success || !parsed.data.constraints) {
      return {} as { allowsMultipleItems?: boolean; maxItems?: number };
    }

    return {
      allowsMultipleItems: parsed.data.constraints.allowsMultipleItems,
      maxItems: parsed.data.constraints.maxItems,
    };
  }

  resolveMaxItems(
    sectionTypeMaxItems?: number | null,
    allowsMultipleItems?: boolean,
    definitionMaxItems?: number,
  ): number | null | undefined {
    if (definitionMaxItems !== undefined) {
      return definitionMaxItems;
    }

    if (allowsMultipleItems === false) {
      return 1;
    }

    return sectionTypeMaxItems;
  }

  async ensureWithinLimit(resumeSectionId: string, maxItems?: number | null): Promise<void> {
    if (!maxItems) {
      return;
    }

    const currentCount = await this.repository.countSectionItems(resumeSectionId);

    if (currentCount >= maxItems) {
      throw new BadRequestException(`Section reached maximum item limit (${maxItems})`);
    }
  }
}
