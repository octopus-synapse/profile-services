import type { CreatedUser, CreateUserData } from './user-management.port';

export abstract class CreateUserUseCasePort {
  abstract execute(data: CreateUserData): Promise<CreatedUser>;
}
