/**
 * Pure-TS wiring for the identity/users BC. Zero `@nestjs/*` imports.
 *
 * Uses the existing per-feature compositions
 * (`user-profile.composition.ts`, `user-preferences.composition.ts`,
 * `username.composition.ts`, `user-management.composition.ts`) plus
 * the BC's own facade services (`UsernameService`, `UserManagementService`).
 *
 * Cross-BC dependency: `authorization` (the AuthorizationService from
 * the authorization BC) — both `UsersHttpBundle` and the
 * `UserManagementService` consume it.
 */

import type { AuthorizationService } from '@/bounded-contexts/identity/authorization/application/services/authorization.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { UsersHttpBundle } from './application/ports/users-http.bundle';
import { UserManagementService } from './application/services/user-management.service';
import { UsernameService } from './application/services/username.service';
import {
  buildUserManagementUseCases,
  UserManagementUseCases,
} from './application/user-management.composition';
import {
  buildUserPreferencesUseCases,
  UserPreferencesUseCases,
} from './application/user-preferences.composition';
import {
  buildUserProfileUseCases,
  UserProfileUseCases,
} from './application/user-profile.composition';
import { buildUsernameUseCases, UsernameUseCases } from './application/username.composition';
import {
  UserMutationRepository,
  UserQueryRepository,
  UsersRepository,
} from './infrastructure/adapters/persistence';
import { usersRoutes } from './users.routes';

export { UsersHttpBundle };

export interface UsersUseCases {
  readonly bundle: UsersHttpBundle;
  readonly profile: UserProfileUseCases;
  readonly preferences: UserPreferencesUseCases;
  readonly username: UsernameUseCases;
  readonly management: UserManagementUseCases;
  readonly usernameService: UsernameService;
  readonly userManagementService: UserManagementService;
  readonly usersRepository: UsersRepository;
}

export function buildUsersUseCases(
  prisma: PrismaService,
  resumesRepository: ResumesRepository,
  authorization: AuthorizationService,
  logger: LoggerPort,
): UsersUseCases {
  // Repositories.
  const userQuery = new UserQueryRepository(prisma, logger);
  const userMutation = new UserMutationRepository(prisma, logger);
  const usersRepository = new UsersRepository(userQuery, userMutation, logger);

  // Sub-composition use-case bundles.
  const profile = buildUserProfileUseCases(prisma, resumesRepository);
  const preferences = buildUserPreferencesUseCases(prisma, logger);
  const username = buildUsernameUseCases(prisma);
  // OWASP-recommended cost is 12; tests pin BCRYPT_COST=4 in .env.test
  // to drop hash time from ~80ms to ~6ms. Same algorithm — fewer rounds.
  const bcryptCost = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);
  const management = buildUserManagementUseCases(
    prisma,
    (password: string) => Bun.password.hash(password, { algorithm: 'bcrypt', cost: bcryptCost }),
    logger,
  );

  // Facades that route handlers depend on.
  const usernameService = new UsernameService(username, usersRepository, logger);
  const userManagementService = new UserManagementService(management, authorization);

  const bundle: UsersHttpBundle = {
    profile,
    preferences,
    usernameService,
    authorization,
    userManagement: userManagementService,
  };

  return {
    bundle,
    profile,
    preferences,
    username,
    management,
    usernameService,
    userManagementService,
    usersRepository,
  };
}

export function buildUsersComposition(
  prisma: PrismaService,
  resumesRepository: ResumesRepository,
  authorization: AuthorizationService,
  logger: LoggerPort,
): BoundedContextComposition<UsersHttpBundle> {
  const useCases = buildUsersUseCases(prisma, resumesRepository, authorization, logger);

  return {
    useCases: useCases.bundle,
    routes: usersRoutes,
  };
}
