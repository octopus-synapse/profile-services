/**
 * Aggregated HTTP-facing bundle for the users BC.
 *
 * Routes depend on this single bundle. Use cases live under the
 * `useCases` namespace; cross-cutting infrastructure ports (i18n,
 * authorization checks) live alongside it.
 *
 * Each use case is referenced by its per-UC port so test fixtures can
 * swap fakes without touching the route handler. Following ADR-002:
 * no `*Service` facades on this bundle.
 */

import type { AuthorizationService } from '@/bounded-contexts/identity/authorization/application/services/authorization.service';
import type { TranslationPort } from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { UserManagementService } from '../services/user-management.service';
import type { UsernameUseCasesBundle } from '../username.composition';
import type { UserPreferencesUseCases } from './user-preferences.port';
import type { UserProfileUseCases } from './user-profile.port';

export interface UsersUseCasesBundle extends UsernameUseCasesBundle {
  // Future commits in this PR (Commit 3 onwards) extend this bundle with
  // user-management UCs once UserManagementService is decomposed.
}

export abstract class UsersHttpBundle {
  abstract readonly profile: UserProfileUseCases;
  abstract readonly preferences: UserPreferencesUseCases;
  abstract readonly useCases: UsersUseCasesBundle;
  abstract readonly i18n: TranslationPort;
  abstract readonly authorization: AuthorizationService;
  abstract readonly userManagement: UserManagementService;
}
