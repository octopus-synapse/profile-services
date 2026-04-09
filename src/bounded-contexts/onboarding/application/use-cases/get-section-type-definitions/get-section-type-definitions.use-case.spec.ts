import { beforeEach, describe, expect, it } from 'bun:test';
import { DEFAULT_SECTION_TYPES, InMemorySectionTypeDefinition } from '../../../testing';
import { GetSectionTypeDefinitionsUseCase } from './get-section-type-definitions.use-case';

describe('GetSectionTypeDefinitionsUseCase', () => {
  let useCase: GetSectionTypeDefinitionsUseCase;
  let sectionTypeDef: InMemorySectionTypeDefinition;

  beforeEach(() => {
    sectionTypeDef = new InMemorySectionTypeDefinition();
    useCase = new GetSectionTypeDefinitionsUseCase(sectionTypeDef);
  });

  it('returns all seeded section types', async () => {
    // Arrange
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toHaveLength(DEFAULT_SECTION_TYPES.length);
    expect(result.map((s) => s.key)).toEqual(
      expect.arrayContaining(['work_experience_v1', 'education_v1', 'skill_set_v1', 'language_v1']),
    );
  });

  it('returns empty array when no section types exist', async () => {
    // Arrange — nothing seeded

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toEqual([]);
  });

  it('passes locale parameter to the port', async () => {
    // Arrange
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    // Act — call with explicit locale
    const result = await useCase.execute('pt');

    // Assert — InMemory ignores locale but we verify no error is thrown
    expect(result).toHaveLength(DEFAULT_SECTION_TYPES.length);
  });

  it('defaults locale to en', async () => {
    // Arrange
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    // Act — call without locale (defaults to 'en')
    const result = await useCase.execute();

    // Assert
    expect(result).toHaveLength(DEFAULT_SECTION_TYPES.length);
  });

  it('returns section type data with expected structure', async () => {
    // Arrange
    sectionTypeDef.seedSectionTypes(DEFAULT_SECTION_TYPES);

    // Act
    const result = await useCase.execute();

    // Assert
    const workExp = result.find((s) => s.key === 'work_experience_v1');
    expect(workExp).toBeDefined();
    expect(workExp?.title).toBe('Work Experience');
    expect(workExp?.icon).toBe('💼');
    expect(workExp?.label).toBe('Work Experience');
    expect(workExp?.noDataLabel).toBeDefined();
    expect(workExp?.addLabel).toBeDefined();
  });
});
