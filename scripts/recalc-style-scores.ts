/**
 * Recompute the Style Score of every system ResumeStyle using the REAL
 * backend scorer path — nothing hardcoded:
 *   - criteria loaded from the `StyleScoringCriterion` table (live DB)
 *   - styleConfig loaded from the `ResumeStyle` rows (live DB)
 *   - scoring via the production `StyleScorerAdapter` + `scoreStyle` rule
 *
 * Run inside the backend container:  bun run scripts/recalc-style-scores.ts
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { PrismaStyleScoringCatalogRepository } from '@/bounded-contexts/resume-styles/infrastructure/adapters/persistence/prisma-style-scoring-catalog.repository';
import { StyleScorerAdapter } from '@/bounded-contexts/resume-styles/infrastructure/adapters/style-scorer.adapter';
import { ConsoleLoggerAdapter } from '@/shared-kernel/logger/console-adapter';

const prisma = new PrismaService(new ConsoleLoggerAdapter());
await prisma.$connect();
const scorer = new StyleScorerAdapter(new PrismaStyleScoringCatalogRepository(prisma));

const criteria = await prisma.styleScoringCriterion.count({ where: { active: true } });
console.log(`Active criteria in DB: ${criteria}\n`);

const styles = await prisma.resumeStyle.findMany({
  where: { isSystem: true },
  orderBy: { name: 'asc' },
  select: { name: true, styleConfig: true, layoutKind: true, styleScore: true },
});

for (const s of styles) {
  const result = await scorer.score({
    styleConfig: s.styleConfig as Record<string, unknown>,
    layoutKind: s.layoutKind,
  });
  console.log(`${s.name}`);
  console.log(`  stored styleScore : ${s.styleScore}`);
  console.log(`  REAL recomputed   : ${result.overall}`);
  console.log(`  breakdown         : ${JSON.stringify(result.breakdown)}`);
  console.log(`  issues            : ${result.issues.length === 0 ? 'none' : JSON.stringify(result.issues)}`);
  console.log(`  match stored?     : ${result.overall === s.styleScore ? 'YES ✅' : 'NO ❌'}\n`);
}

await prisma.$disconnect();
