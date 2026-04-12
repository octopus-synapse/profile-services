/**
 * Prisma ATS Score Catalog Repository
 *
 * Loads section type definitions from the database for ATS scoring.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  AtsScoreCatalogPort,
  SectionTypeAtsConfig,
} from '../../../application/ports/resume-analytics.port';

export class PrismaAtsScoreCatalogRepository implements AtsScoreCatalogPort {
  constructor(private readonly prisma: PrismaService) {}

  async loadCatalog(): Promise<SectionTypeAtsConfig[]> {
    const sectionTypes = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: { key: true, semanticKind: true, definition: true },
    });

    return sectionTypes.map((st) => {
      const def = (st.definition ?? {}) as Record<string, unknown>;
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
}
