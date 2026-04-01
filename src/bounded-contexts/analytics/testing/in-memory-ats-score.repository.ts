/**
 * In-Memory ATS Score Repository
 *
 * Test implementation for ATSScoreService dependencies.
 * Stores section type definitions in memory for fast, isolated testing.
 */

export interface SectionTypeRecord {
  key: string;
  semanticKind: string;
  definition: Record<string, unknown>;
  isActive?: boolean;
}

export class InMemoryATSScoreRepository {
  private sectionTypes: Map<string, SectionTypeRecord> = new Map();

  /**
   * Mimics PrismaService.sectionType.findMany
   */
  async findMany(args?: { where?: { isActive?: boolean } }): Promise<SectionTypeRecord[]> {
    let results = Array.from(this.sectionTypes.values());

    if (args?.where?.isActive !== undefined) {
      results = results.filter((st) => (st.isActive ?? true) === args.where?.isActive);
    }

    return results.map((st) => ({
      key: st.key,
      semanticKind: st.semanticKind,
      definition: st.definition,
    }));
  }

  /**
   * Seeds section type definitions for testing
   */
  seedSectionType(sectionType: SectionTypeRecord): void {
    this.sectionTypes.set(sectionType.key, {
      ...sectionType,
      isActive: sectionType.isActive ?? true,
    });
  }

  /**
   * Seeds multiple section types at once
   */
  seedSectionTypes(sectionTypes: SectionTypeRecord[]): void {
    for (const st of sectionTypes) {
      this.seedSectionType(st);
    }
  }

  /**
   * Gets all section types (for test verification)
   */
  getAll(): SectionTypeRecord[] {
    return Array.from(this.sectionTypes.values());
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.sectionTypes.clear();
  }
}
