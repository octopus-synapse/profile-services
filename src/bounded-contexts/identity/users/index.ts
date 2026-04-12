// Module

// Application - Ports
export {
  USER_MANAGEMENT_USE_CASES,
  USER_PREFERENCES_USE_CASES,
  USERNAME_USE_CASES,
} from './application/ports';
// Application - Services (with real domain logic)
export { UserManagementService, UsernameService } from './application/services';
// Infrastructure - Repositories (for external use)
export { UserMutationRepository } from './infrastructure/adapters/persistence/user-mutation.repository';
export { UserQueryRepository } from './infrastructure/adapters/persistence/user-query.repository';
export { UsersRepository } from './infrastructure/adapters/persistence/users.repository';
export * from './users.module';
