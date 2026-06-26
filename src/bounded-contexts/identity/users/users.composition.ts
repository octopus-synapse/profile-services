import { BcryptPasswordHasher } from '@/bounded-contexts/identity/account-lifecycle/infrastructure/adapters/bcrypt-password.hasher';
import type { AuthorizationService } from '@/bounded-contexts/identity/authorization/application/services/authorization.service';
import type { TranslationPort } from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import type { LoggerPort } from '@/shared-kernel';
import type { AuditLogPort } from '@/shared-kernel/audit';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import { buildConnectedAccountsUseCases } from './application/connected-accounts.composition';
import { UsersHttpBundle } from './application/ports/users-http.bundle';
import {
  buildUserManagementUseCases,
  type UserManagementUseCasesBundle,
} from './application/user-management.composition';
import {
  buildUserPreferencesUseCases,
  UserPreferencesUseCases,
} from './application/user-preferences.composition';
import {
  buildUserProfileUseCases,
  UserProfileUseCases,
} from './application/user-profile.composition';
import {
  buildUsernameUseCases,
  type UsernameUseCasesBundle,
} from './application/username.composition';
import {
  UserMutationRepository,
  UserQueryRepository,
  UsersRepository,
} from './infrastructure/adapters/persistence';
import { usersRoutes } from './users.routes';
import { usersAdminRoutes } from './users-admin.routes';

export { UsersHttpBundle };

export interface UsersUseCases {
  readonly bundle: UsersHttpBundle;
  readonly profile: UserProfileUseCases;
  readonly preferences: UserPreferencesUseCases;
  readonly username: UsernameUseCasesBundle;
  readonly management: UserManagementUseCasesBundle;
  readonly usersRepository: UsersRepository;
}

export function buildUsersUseCases(
  prisma: PrismaService,
  resumesRepository: ResumesRepository,
  authorization: AuthorizationService,
  i18n: TranslationPort,
  logger: LoggerPort,
  auditLog: AuditLogPort,
  config: ConfigPort,
): UsersUseCases {
  const userQuery = new UserQueryRepository(prisma, logger);
  const userMutation = new UserMutationRepository(prisma, logger);
  const usersRepository = new UsersRepository(userQuery, userMutation, logger);

  const profile = buildUserProfileUseCases(prisma, resumesRepository);
  const preferences = buildUserPreferencesUseCases(prisma, logger, auditLog);
  const username = buildUsernameUseCases(prisma);
  // P1-#A1-17: cost from validated `EnvConfigSchema.BCRYPT_COST` instead
  // of unchecked `process.env.BCRYPT_COST` (the schema enforces min(10)).
  const passwordHasher = new BcryptPasswordHasher(config.env.BCRYPT_COST);
  const management = buildUserManagementUseCases(
    prisma,
    (password: string) => passwordHasher.hash(password),
    authorization,
    logger,
  );
  const connectedAccounts = buildConnectedAccountsUseCases(prisma);

  const bundle: UsersHttpBundle = {
    profile,
    preferences,
    useCases: { ...username, ...management, ...connectedAccounts },
    i18n,
    authorization,
  };

  return {
    bundle,
    profile,
    preferences,
    username,
    management,
    usersRepository,
  };
}

export function buildUsersComposition(
  prisma: PrismaService,
  resumesRepository: ResumesRepository,
  authorization: AuthorizationService,
  i18n: TranslationPort,
  logger: LoggerPort,
  auditLog: AuditLogPort,
  config: ConfigPort,
): BoundedContextComposition<UsersHttpBundle> {
  const useCases = buildUsersUseCases(
    prisma,
    resumesRepository,
    authorization,
    i18n,
    logger,
    auditLog,
    config,
  );

  return {
    useCases: useCases.bundle,
    routes: [...usersRoutes, ...usersAdminRoutes],
  };
}
