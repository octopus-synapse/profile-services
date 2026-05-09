import type { UserDetails } from './user-management.port';

export abstract class GetUserDetailsUseCasePort {
  abstract execute(userId: string): Promise<UserDetails>;
}
