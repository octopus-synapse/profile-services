import type { UsernameAvailability, UsernameRepositoryPort } from '../../ports/username.port';

/**
 * Check Username Availability Use Case
 *
 * Single Responsibility: Check if a username is available.
 * Returns domain entity (UsernameAvailability), not envelope.
 */
export class CheckUsernameAvailabilityUseCase {
  constructor(private readonly repository: UsernameRepositoryPort) {}

  async execute(username: string, userId?: string): Promise<UsernameAvailability> {
    const normalizedUsername = username.toLowerCase();
    const isTaken = await this.repository.isUsernameTaken(normalizedUsername, userId);

    return {
      username: normalizedUsername,
      available: !isTaken,
    };
  }
}
