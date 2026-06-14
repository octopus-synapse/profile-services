import type { AuthorizationService } from '@/bounded-contexts/identity/authorization/application/services/authorization.service';
import type { TranslationPort } from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { ConnectedAccountsUseCasesBundle } from '../connected-accounts.composition';
import type { UserManagementUseCasesBundle } from '../user-management.composition';
import type { UsernameUseCasesBundle } from '../username.composition';
import type { UserPreferencesUseCases } from './user-preferences.port';
import type { UserProfileUseCases } from './user-profile.port';

export interface UsersUseCasesBundle
  extends UsernameUseCasesBundle,
    UserManagementUseCasesBundle,
    ConnectedAccountsUseCasesBundle {}

export abstract class UsersHttpBundle {
  abstract readonly profile: UserProfileUseCases;
  abstract readonly preferences: UserPreferencesUseCases;
  abstract readonly useCases: UsersUseCasesBundle;
  abstract readonly i18n: TranslationPort;
  abstract readonly authorization: AuthorizationService;
}
