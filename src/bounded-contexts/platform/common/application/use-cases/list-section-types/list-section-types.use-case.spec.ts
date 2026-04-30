import { describe, expect, it } from 'bun:test';
import { InMemorySectionTypesCatalog } from '../../../testing';
import { ListSectionTypesUseCase } from './list-section-types.use-case';

describe('ListSectionTypesUseCase', () => {
  it('returns the catalog projection in order', async () => {
    const catalog = new InMemorySectionTypesCatalog([
      { key: 'experience', semanticKind: 'work', title: 'Experience' },
      { key: 'education', semanticKind: 'edu', title: 'Education' },
    ]);

    const result = await new ListSectionTypesUseCase(catalog).execute();

    expect(result).toHaveLength(2);
    expect(result[0]?.key).toBe('experience');
    expect(result[1]?.title).toBe('Education');
  });

  it('returns empty when the catalog is empty', async () => {
    const result = await new ListSectionTypesUseCase(new InMemorySectionTypesCatalog([])).execute();
    expect(result).toEqual([]);
  });
});
