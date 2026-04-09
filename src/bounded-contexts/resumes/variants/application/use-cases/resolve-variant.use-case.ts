import type { VariantData, VariantRepositoryPort } from '../ports/variant-repository.port';

interface GenericResumeSection {
  id: string;
  sectionTypeKey: string;
  semanticKind: string;
  title: string;
  titleOverride?: string;
  isVisible: boolean;
  order: number;
  items: Array<{
    id: string;
    content: Record<string, unknown>;
    isVisible: boolean;
    order: number;
  }>;
}

interface VariantOverrides {
  textOverrides: Record<string, string>;
  visibilityOverrides: Record<string, boolean>;
  orderOverrides: Record<string, number>;
}

export interface BaseSectionsReader {
  getSections(resumeId: string): Promise<GenericResumeSection[]>;
}

export const BASE_SECTIONS_READER = Symbol('BASE_SECTIONS_READER');

export class ResolveVariantUseCase {
  constructor(
    private readonly variantRepo: VariantRepositoryPort,
    private readonly sectionsReader: BaseSectionsReader,
  ) {}

  async execute(
    variantId: string,
  ): Promise<{ sections: GenericResumeSection[]; variant: VariantData }> {
    const variant = await this.variantRepo.findById(variantId);
    if (!variant) throw new Error('Variant not found');

    const baseSections = await this.sectionsReader.getSections(variant.baseResumeId);

    const resolvedSections = this.applyOverlay(baseSections, {
      textOverrides: variant.textOverrides,
      visibilityOverrides: variant.visibilityOverrides,
      orderOverrides: variant.orderOverrides,
    });

    return { sections: resolvedSections, variant };
  }

  private applyOverlay(
    sections: GenericResumeSection[],
    overrides: VariantOverrides,
  ): GenericResumeSection[] {
    return sections
      .map((section) => {
        const sectionKey = section.id;

        const isVisible =
          sectionKey in overrides.visibilityOverrides
            ? overrides.visibilityOverrides[sectionKey]
            : section.isVisible;

        const order =
          sectionKey in overrides.orderOverrides
            ? overrides.orderOverrides[sectionKey]
            : section.order;

        const titleOverride =
          `title:${sectionKey}` in overrides.textOverrides
            ? overrides.textOverrides[`title:${sectionKey}`]
            : section.titleOverride;

        const items = section.items.map((item) => {
          const itemKey = item.id;
          const resolvedContent: Record<string, unknown> = {};

          for (const [field, value] of Object.entries(item.content)) {
            const overrideKey = `${itemKey}:${field}`;
            resolvedContent[field] =
              overrideKey in overrides.textOverrides
                ? overrides.textOverrides[overrideKey]
                : value;
          }

          const itemVisible =
            itemKey in overrides.visibilityOverrides
              ? overrides.visibilityOverrides[itemKey]
              : item.isVisible;

          const itemOrder =
            itemKey in overrides.orderOverrides
              ? overrides.orderOverrides[itemKey]
              : item.order;

          return {
            ...item,
            content: resolvedContent,
            isVisible: itemVisible,
            order: itemOrder,
          };
        });

        return {
          ...section,
          titleOverride,
          isVisible,
          order,
          items,
        };
      })
      .sort((a, b) => a.order - b.order);
  }
}
