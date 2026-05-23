import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { DeleteUiStateKeyUseCasePort } from './application/ports/delete-ui-state-key.use-case.port';
import type { GetAllUiStateUseCasePort } from './application/ports/get-all-ui-state.use-case.port';
import type { SetUiStateKeyUseCasePort } from './application/ports/set-ui-state-key.use-case.port';
import { DeleteUiStateKeyUseCase } from './application/use-cases/delete-ui-state-key.use-case';
import { GetAllUiStateUseCase } from './application/use-cases/get-all-ui-state.use-case';
import { SetUiStateKeyUseCase } from './application/use-cases/set-ui-state-key.use-case';
import { PrismaUiStateRepository } from './infrastructure/adapters/persistence/prisma-ui-state.repository';
import { uiStateRoutes } from './ui-state.routes';

export interface UiStateUseCasesBundle {
  readonly getAll: GetAllUiStateUseCasePort;
  readonly setKey: SetUiStateKeyUseCasePort;
  readonly deleteKey: DeleteUiStateKeyUseCasePort;
}

export function buildUiStateUseCases(
  prisma: PrismaService,
  logger?: LoggerPort,
): UiStateUseCasesBundle {
  const repository = new PrismaUiStateRepository(prisma, logger);
  return {
    getAll: new GetAllUiStateUseCase(repository),
    setKey: new SetUiStateKeyUseCase(repository),
    deleteKey: new DeleteUiStateKeyUseCase(repository),
  };
}

export function buildUiStateComposition(
  prisma: PrismaService,
  logger?: LoggerPort,
): BoundedContextComposition<UiStateUseCasesBundle> {
  const useCases = buildUiStateUseCases(prisma, logger);
  return {
    useCases,
    routes: uiStateRoutes,
  };
}
