import { describe, expect, it } from 'bun:test';
import type { VariantOverrides } from './variant.types';
import type { GenericResumeSection } from './variant-overlay';
import { applyVariantOverlay } from './variant-overlay';

function makeSection(overrides: Partial<GenericResumeSection> = {}): GenericResumeSection {
  return {
    id: 'section-1',
    sectionTypeKey: 'experience',
    semanticKind: 'work_experience',
    title: 'Experience',
    isVisible: true,
    order: 0,
    items: [],
    ...overrides,
  };
}

function emptyOverrides(): VariantOverrides {
  return {
    textOverrides: {},
    visibilityOverrides: {},
    orderOverrides: {},
  };
}

describe('applyVariantOverlay', () => {
  it('should return a deep copy of base sections when no overrides are provided', () => {
    const base: GenericResumeSection[] = [
      makeSection({
        items: [{ id: 'item-1', content: { title: 'Engineer' }, isVisible: true, order: 0 }],
      }),
    ];

    const result = applyVariantOverlay(base, emptyOverrides());

    expect(result).toEqual(base);
    expect(result).not.toBe(base);
    expect(result[0]).not.toBe(base[0]);
    expect(result[0].items[0]).not.toBe(base[0].items[0]);
    expect(result[0].items[0].content).not.toBe(base[0].items[0].content);
  });

  it('should replace a specific field in a specific item via text override', () => {
    const base: GenericResumeSection[] = [
      makeSection({
        items: [
          {
            id: 'item-1',
            content: { title: 'Junior Engineer', company: 'Acme' },
            isVisible: true,
            order: 0,
          },
        ],
      }),
    ];

    const overrides: VariantOverrides = {
      ...emptyOverrides(),
      textOverrides: { 'item-1:title': 'Senior Frontend Engineer' },
    };

    const result = applyVariantOverlay(base, overrides);

    expect(result[0].items[0].content.title).toBe('Senior Frontend Engineer');
    expect(result[0].items[0].content.company).toBe('Acme');
  });

  it('should hide a section via visibility override', () => {
    const base: GenericResumeSection[] = [makeSection({ id: 'section-skills', isVisible: true })];

    const overrides: VariantOverrides = {
      ...emptyOverrides(),
      visibilityOverrides: { 'section-skills': false },
    };

    const result = applyVariantOverlay(base, overrides);

    expect(result[0].isVisible).toBe(false);
  });

  it('should hide a specific item via visibility override', () => {
    const base: GenericResumeSection[] = [
      makeSection({
        items: [
          { id: 'item-1', content: { title: 'Keep' }, isVisible: true, order: 0 },
          { id: 'item-2', content: { title: 'Hide' }, isVisible: true, order: 1 },
        ],
      }),
    ];

    const overrides: VariantOverrides = {
      ...emptyOverrides(),
      visibilityOverrides: { 'item-2': false },
    };

    const result = applyVariantOverlay(base, overrides);

    expect(result[0].items[0].isVisible).toBe(true);
    expect(result[0].items[1].isVisible).toBe(false);
  });

  it('should reorder sections via order override', () => {
    const base: GenericResumeSection[] = [
      makeSection({ id: 'section-exp', title: 'Experience', order: 0 }),
      makeSection({ id: 'section-skills', title: 'Skills', order: 1 }),
      makeSection({ id: 'section-edu', title: 'Education', order: 2 }),
    ];

    const overrides: VariantOverrides = {
      ...emptyOverrides(),
      orderOverrides: { 'section-skills': 0, 'section-exp': 2 },
    };

    const result = applyVariantOverlay(base, overrides);

    expect(result[0].id).toBe('section-skills');
    expect(result[1].id).toBe('section-edu');
    expect(result[2].id).toBe('section-exp');
  });

  it('should apply text, visibility, and order overrides simultaneously', () => {
    const base: GenericResumeSection[] = [
      makeSection({
        id: 'section-exp',
        title: 'Experience',
        order: 0,
        items: [{ id: 'item-1', content: { title: 'Engineer' }, isVisible: true, order: 0 }],
      }),
      makeSection({
        id: 'section-skills',
        title: 'Skills',
        order: 1,
        items: [],
      }),
    ];

    const overrides: VariantOverrides = {
      textOverrides: { 'item-1:title': 'Lead Engineer' },
      visibilityOverrides: { 'section-skills': false },
      orderOverrides: { 'section-skills': 0, 'section-exp': 1 },
    };

    const result = applyVariantOverlay(base, overrides);

    expect(result[0].id).toBe('section-skills');
    expect(result[1].id).toBe('section-exp');
    expect(result[0].isVisible).toBe(false);
    expect(result[1].items[0].content.title).toBe('Lead Engineer');
  });

  it('should safely ignore overrides for non-existent sections or items', () => {
    const base: GenericResumeSection[] = [
      makeSection({
        items: [{ id: 'item-1', content: { title: 'Engineer' }, isVisible: true, order: 0 }],
      }),
    ];

    const overrides: VariantOverrides = {
      textOverrides: { 'nonexistent-item:title': 'Ghost' },
      visibilityOverrides: { 'nonexistent-section': false },
      orderOverrides: { 'nonexistent-section': 99 },
    };

    const result = applyVariantOverlay(base, overrides);

    expect(result).toEqual(base);
  });

  it('should not mutate the original input sections', () => {
    const base: GenericResumeSection[] = [
      makeSection({
        id: 'section-exp',
        isVisible: true,
        order: 0,
        items: [{ id: 'item-1', content: { title: 'Engineer' }, isVisible: true, order: 0 }],
      }),
    ];

    const originalTitle = base[0].items[0].content.title;
    const originalVisible = base[0].isVisible;
    const originalOrder = base[0].order;

    const overrides: VariantOverrides = {
      textOverrides: { 'item-1:title': 'Changed Title' },
      visibilityOverrides: { 'section-exp': false },
      orderOverrides: { 'section-exp': 99 },
    };

    applyVariantOverlay(base, overrides);

    expect(base[0].items[0].content.title).toBe(originalTitle);
    expect(base[0].isVisible).toBe(originalVisible);
    expect(base[0].order).toBe(originalOrder);
  });
});
