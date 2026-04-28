/**
 * Pure-TS wiring for the identity/users/ui-state sub-BC. Zero
 * `@nestjs/*` imports.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { uiStateRoutes } from './ui-state.routes';
import { UiStateService } from './ui-state.service';

export function buildUiStateUseCases(prisma: PrismaService): UiStateService {
  return new UiStateService(prisma);
}

export function buildUiStateComposition(
  prisma: PrismaService,
): BoundedContextComposition<UiStateService> {
  const useCases = buildUiStateUseCases(prisma);

  return {
    useCases,
    routes: uiStateRoutes,
  };
}
