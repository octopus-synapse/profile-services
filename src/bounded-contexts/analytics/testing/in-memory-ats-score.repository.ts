/**
 * In-Memory ATS Score Repository
 *
 * Port-level fake for AtsScoreCatalogPort.
 */

import {
  AtsScoreCatalogPort,
  type SectionTypeAtsConfig,
} from '../resume-analytics/application/ports/resume-analytics.port';

export interface SectionTypeRecord {
  key: string;
  semanticKind: string;
  definition: Record<string, unknown>;
  isActive?: boolean;
}

export class InMemoryATSScoreRepository extends AtsScoreCatalogPort {
  private sectionTypes: Map<string, SectionTypeRecord> = new Map();

  async loadCatalog(): Promise<SectionTypeAtsConfig[]> {
    return Array.from(this.sectionTypes.values())
      .filter((st) => st.isActive ?? true)
      .map((st) => {
        const def = st.definition;
        const ats = (def.ats ?? {}) as Record<string, unknown>;
        const scoring = (ats.scoring ?? {}) as Record<string, unknown>;
        const fields = (def.fields ?? []) as Array<Record<string, unknown>>;

        const roleToFieldKey: Record<string, string> = {};
        for (const field of fields) {
          if (typeof field.semanticRole === 'string' && typeof field.key === 'string') {
            roleToFieldKey[field.semanticRole] = field.key;
          }
        }

        return {
          key: st.key,
          kind: st.semanticKind,
          ats: {
            isMandatory: (ats.isMandatory as boolean) ?? false,
            recommendedPosition: (ats.recommendedPosition as number) ?? 99,
            scoring: {
              baseScore: (scoring.baseScore as number) ?? 30,
              fieldWeights: (scoring.fieldWeights as Record<string, number>) ?? {},
            },
          },
          roleToFieldKey,
        };
      });
  }

  /** Kept for tests that verify catalog contents directly. */
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

  seedSectionType(sectionType: SectionTypeRecord): void {
    this.sectionTypes.set(sectionType.key, {
      ...sectionType,
      isActive: sectionType.isActive ?? true,
    });
  }

  seedSectionTypes(sectionTypes: SectionTypeRecord[]): void {
    for (const st of sectionTypes) {
      this.seedSectionType(st);
    }
  }

  getAll(): SectionTypeRecord[] {
    return Array.from(this.sectionTypes.values());
  }

  clear(): void {
    this.sectionTypes.clear();
  }
}
