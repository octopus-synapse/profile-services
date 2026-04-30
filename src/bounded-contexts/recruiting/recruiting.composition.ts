/**
 * Pure-TS wiring for the recruiting BC. Zero `@nestjs/*` imports —
 * Phase-1 canonical shape: returns `{ useCases, routes }` as a
 * `BoundedContextComposition`.
 *
 * Recruiting exposes a single inbound use-case (`MatchCandidatesForJobUseCase`)
 * via the `MatchCandidatesForJobPort` token. The HTTP route descriptor in
 * `recruiting.routes.ts` declares the per-route rate-limit guard via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]` — the synthesizer
 * resolves the guard registry on the Nest side; the Elysia adapter applies
 * the same metadata via its own guard middleware.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { MatchCandidatesForJobUseCase } from './application';
import { MatchCandidatesForJobPort } from './application/ports/match-candidates.inbound-port';
import { PrismaCandidateDirectoryRepository } from './infrastructure/adapters';
import { recruitingRoutes } from './recruiting.routes';

export { MatchCandidatesForJobPort };

export function buildRecruitingUseCases(prisma: PrismaService): MatchCandidatesForJobPort {
  const directory = new PrismaCandidateDirectoryRepository(prisma);
  return new MatchCandidatesForJobUseCase(directory);
}

export function buildRecruitingComposition(
  prisma: PrismaService,
): BoundedContextComposition<MatchCandidatesForJobPort> {
  const useCases = buildRecruitingUseCases(prisma);

  return {
    useCases,
    routes: recruitingRoutes,
  };
}
