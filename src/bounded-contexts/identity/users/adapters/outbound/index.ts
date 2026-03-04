/**
 * Outbound Adapters
 *
 * Repository implementations that connect to external data sources.
 */

export { UserMutationRepository } from '../../repositories/user-mutation.repository';
// Re-export from existing locations for backward compatibility
export { UserQueryRepository } from '../../repositories/user-query.repository';
export { UserManagementRepository } from '../../services/user-management/repository/user-management.repository';
export { UserPreferencesRepository } from '../../services/user-preferences/repository/user-preferences.repository';
export { UsernameRepository } from '../../services/username/repository/username.repository';
export { UsersRepository } from '../../users.repository';
