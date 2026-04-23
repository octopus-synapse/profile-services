import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { StyleScorerPort } from './domain/ports/style-scorer.port';
import { StyleScorerAdapter } from './infrastructure/adapters/style-scorer.adapter';

/**
 * ResumeStyles Bounded Context — minimal skeleton.
 *
 * The old theme CRUD (controllers, repositories, use-cases) was removed
 * during the scoring refactor. Fresh implementations aligned with the
 * new schema land in the follow-up tasks (see docs/scoring/README.md
 * and the plan file). What remains here is the `StyleScorerPort`
 * abstraction plus a placeholder adapter so the module still boots and
 * downstream contexts can start wiring against a stable surface.
 */
@Module({
  imports: [PrismaModule],
  providers: [StyleScorerAdapter, { provide: StyleScorerPort, useExisting: StyleScorerAdapter }],
  exports: [StyleScorerPort],
})
export class ResumeStylesModule {}
