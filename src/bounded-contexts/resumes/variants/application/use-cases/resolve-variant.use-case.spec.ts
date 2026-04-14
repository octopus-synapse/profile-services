import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  CreateVariantInput,
  VariantData,
  VariantRepositoryPort,
} from '../ports/variant-repository.port';
import type { BaseSectionsReader } from './resolve-variant.use-case';
import { ResolveVariantUseCase } from './resolve-variant.use-case';

class InMemoryVariantRepository implements VariantRepositoryPort {
  private variants: VariantData[] = [];

  seed(variant: VariantData) {
    this.variants.push(variant);
  }

  async findById(id: string): Promise<VariantData | null> {
    return this.variants.find((v) => v.id === id) ?? null;
  }

  async findByBaseResumeId(baseResumeId: string): Promise<VariantData[]> {
    return this.variants.filter((v) => v.baseResumeId === baseResumeId);
  }

  async create(input: CreateVariantInput): Promise<VariantData> {
    const now = new Date();
    const variant: VariantData = {
      id: `variant-new`,
      baseResumeId: input.baseResumeId,
      userId: input.userId,
      name: input.name,
      textOverrides: input.textOverrides ?? {},
      visibilityOverrides: input.visibilityOverrides ?? {},
      orderOverrides: input.orderOverrides ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.variants.push(variant);
    return variant;
  }

  async update(id: string, input: Partial<CreateVariantInput>): Promise<VariantData> {
    const index = this.variants.findIndex((v) => v.id === id);
    if (index === -1) throw new Error('Variant not found');
    this.variants[index] = { ...this.variants[index], ...input, updatedAt: new Date() };
    return this.variants[index];
  }

  async delete(id: string): Promise<void> {
    this.variants = this.variants.filter((v) => v.id !== id);
  }
}

function makeVariant(overrides: Partial<VariantData> = {}): VariantData {
  return {
    id: 'variant-1',
    baseResumeId: 'resume-1',
    userId: 'user-1',
    name: 'Test Variant',
    textOverrides: {},
    visibilityOverrides: {},
    orderOverrides: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'section-1',
    sectionTypeKey: 'experience',
    semanticKind: 'work',
    title: 'Experience',
    isVisible: true,
    order: 1,
    items: [
      {
        id: 'item-1',
        content: { title: 'Engineer', company: 'Acme' },
        isVisible: true,
        order: 1,
      },
    ],
    ...overrides,
  };
}

type TestSection = ReturnType<typeof makeSection>;

class StubSectionsReader implements BaseSectionsReader {
  private sections = new Map<string, TestSection[]>();

  seed(resumeId: string, sections: TestSection[]) {
    this.sections.set(resumeId, sections);
  }

  async getSections(resumeId: string) {
    return this.sections.get(resumeId) ?? [];
  }
}

describe('ResolveVariantUseCase', () => {
  let useCase: ResolveVariantUseCase;
  let variantRepo: InMemoryVariantRepository;
  let sectionsReader: StubSectionsReader;

  beforeEach(() => {
    variantRepo = new InMemoryVariantRepository();
    sectionsReader = new StubSectionsReader();
    useCase = new ResolveVariantUseCase(variantRepo, sectionsReader);
  });

  it('resolves variant by loading base sections and applying overrides', async () => {
    variantRepo.seed(makeVariant());
    sectionsReader.seed('resume-1', [makeSection()]);

    const result = await useCase.execute('variant-1');

    expect(result.variant.id).toBe('variant-1');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe('section-1');
    expect(result.sections[0].items[0].content.title).toBe('Engineer');
  });

  it('throws when variant not found', async () => {
    await expect(useCase.execute('nonexistent')).rejects.toThrow(EntityNotFoundException);
  });

  it('applies text overrides to item content', async () => {
    variantRepo.seed(
      makeVariant({
        textOverrides: { 'item-1:title': 'Senior Engineer' },
      }),
    );
    sectionsReader.seed('resume-1', [makeSection()]);

    const result = await useCase.execute('variant-1');

    expect(result.sections[0].items[0].content.title).toBe('Senior Engineer');
    expect(result.sections[0].items[0].content.company).toBe('Acme');
  });

  it('applies visibility overrides to hide sections', async () => {
    variantRepo.seed(
      makeVariant({
        visibilityOverrides: { 'section-1': false },
      }),
    );
    sectionsReader.seed('resume-1', [makeSection()]);

    const result = await useCase.execute('variant-1');

    expect(result.sections[0].isVisible).toBe(false);
  });

  it('applies order overrides to reorder sections', async () => {
    variantRepo.seed(
      makeVariant({
        orderOverrides: { 'section-1': 10, 'section-2': 1 },
      }),
    );
    sectionsReader.seed('resume-1', [
      makeSection({ id: 'section-1', order: 1, title: 'Experience' }),
      makeSection({ id: 'section-2', order: 2, title: 'Education', items: [] }),
    ]);

    const result = await useCase.execute('variant-1');

    expect(result.sections[0].id).toBe('section-2');
    expect(result.sections[0].order).toBe(1);
    expect(result.sections[1].id).toBe('section-1');
    expect(result.sections[1].order).toBe(10);
  });

  it('applies title override via text overrides', async () => {
    variantRepo.seed(
      makeVariant({
        textOverrides: { 'title:section-1': 'Work History' },
      }),
    );
    sectionsReader.seed('resume-1', [makeSection()]);

    const result = await useCase.execute('variant-1');

    expect(result.sections[0].titleOverride).toBe('Work History');
  });

  it('applies visibility overrides to individual items', async () => {
    variantRepo.seed(
      makeVariant({
        visibilityOverrides: { 'item-1': false },
      }),
    );
    sectionsReader.seed('resume-1', [makeSection()]);

    const result = await useCase.execute('variant-1');

    expect(result.sections[0].items[0].isVisible).toBe(false);
  });
});
