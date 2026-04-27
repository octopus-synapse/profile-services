/**
 * Aggregated HTTP-facing bundle for the users BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. The users BC has multiple sub-bundles
 * (UserProfileUseCases, UserPreferencesUseCases) plus a couple of
 * `@Injectable()` services that the routes need. We aggregate them
 * here so the routes file can stay framework-free and depend on a
 * single bundle.
 *
 * The wiring lives in `users.module.ts` (`useFactory`).
 */

import type { AuthorizationService } from '@/bounded-contexts/identity/authorization/application/services/authorization.service';
import type { UserManagementService } from '../services/user-management.service';
import type { UsernameService } from '../services/username.service';
import type { UserPreferencesUseCases } from './user-preferences.port';
import type { UserProfileUseCases } from './user-profile.port';

export abstract class UsersHttpBundle {
  abstract readonly profile: UserProfileUseCases;
  abstract readonly preferences: UserPreferencesUseCases;
  abstract readonly usernameService: UsernameService;
  abstract readonly authorization: AuthorizationService;
  abstract readonly userManagement: UserManagementService;
}
