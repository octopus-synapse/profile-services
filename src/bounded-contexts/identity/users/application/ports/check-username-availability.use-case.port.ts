export type UsernameUnavailableReason = 'taken' | 'reserved' | 'invalid_format';

export interface UsernameAvailability {
  readonly username: string;
  readonly available: boolean;
  readonly reason?: UsernameUnavailableReason;
}

export abstract class CheckUsernameAvailabilityUseCasePort {
  abstract execute(username: string, requesterUserId?: string): Promise<UsernameAvailability>;
}
