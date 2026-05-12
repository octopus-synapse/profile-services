import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { AuditLogPort } from '@/shared-kernel/audit';
import { UserPreferencesRepository } from '../infrastructure/adapters/persistence/user-preferences.repository';
import { UserPreferencesUseCases } from './ports/user-preferences.port';
import { GetFullPreferencesUseCase } from './use-cases/user-preferences/get-full-preferences.use-case';
import { GetOneClickApplyConfigUseCase } from './use-cases/user-preferences/get-one-click-apply-config.use-case';
import { GetPreferencesUseCase } from './use-cases/user-preferences/get-preferences.use-case';
import { UpdateFullPreferencesUseCase } from './use-cases/user-preferences/update-full-preferences.use-case';
import { UpdateOneClickApplyConfigUseCase } from './use-cases/user-preferences/update-one-click-apply-config.use-case';
import { UpdatePreferencesUseCase } from './use-cases/user-preferences/update-preferences.use-case';

export { UserPreferencesUseCases };

export function buildUserPreferencesUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  auditLog: AuditLogPort,
): UserPreferencesUseCases {
  const repository = new UserPreferencesRepository(prisma, logger);

  return {
    getPreferencesUseCase: new GetPreferencesUseCase(repository),
    updatePreferencesUseCase: new UpdatePreferencesUseCase(repository, auditLog, logger),
    getFullPreferencesUseCase: new GetFullPreferencesUseCase(repository),
    updateFullPreferencesUseCase: new UpdateFullPreferencesUseCase(repository, auditLog, logger),
    getOneClickApplyConfigUseCase: new GetOneClickApplyConfigUseCase(repository),
    updateOneClickApplyConfigUseCase: new UpdateOneClickApplyConfigUseCase(
      repository,
      auditLog,
      logger,
    ),
  };
}
