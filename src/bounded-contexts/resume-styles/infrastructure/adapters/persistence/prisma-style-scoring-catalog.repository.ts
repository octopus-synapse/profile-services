import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { StyleScoringCatalogPort } from '../../../domain/ports/style-scoring-catalog.port';
import type { StyleIssueSeverity, StyleScoringCriterionDef } from '../../../domain/types';

/**
 * Loads active Style Score rubric criteria from the `StyleScoringCriterion`
 * table. Mirrors `PrismaAtsScoreCatalogRepository`. Framework-free POJO.
 */
export class PrismaStyleScoringCatalogRepository extends StyleScoringCatalogPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async loadCriteria(): Promise<StyleScoringCriterionDef[]> {
    const rows = await this.prisma.styleScoringCriterion.findMany({
      where: { active: true },
      orderBy: [{ bucket: 'asc' }, { key: 'asc' }],
    });

    return rows.map((row) => ({
      key: row.key,
      bucket: row.bucket,
      weight: row.weight,
      severity: row.severity as StyleIssueSeverity,
      params: (row.params ?? {}) as Record<string, unknown>,
    }));
  }
}
