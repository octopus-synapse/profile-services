import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type SectionAtsCatalog,
  SectionAtsCatalogPort,
} from '../../../domain/ports/section-ats-catalog.port';

/**
 * Loads the structural ATS rules from `SectionType.definition.ats` for the
 * completeness scorer's mandatory-section + weighted-field checks. Mirrors
 * the catalog loader the retired analytics ATS score used. Framework-free.
 */
export class PrismaSectionAtsCatalogAdapter extends SectionAtsCatalogPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async loadCatalog(): Promise<SectionAtsCatalog> {
    const sectionTypes = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: { semanticKind: true, definition: true },
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
        semanticKind: st.semanticKind,
        isMandatory: (ats.isMandatory as boolean) ?? false,
        fieldWeights: (scoring.fieldWeights as Record<string, number>) ?? {},
        roleToFieldKey,
      };
    });
  }
}
