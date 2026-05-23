import { RESERVED_USERNAMES_SET } from '../../../domain/value-objects/reserved-usernames.const';
import { isValidUsernameFormat } from '../../../domain/value-objects/username-rules.const';
import {
  CheckUsernameAvailabilityUseCasePort,
  type UsernameAvailability,
} from '../../ports/check-username-availability.use-case.port';
import { UsernameRepositoryPort } from '../../ports/username.port';

export class CheckUsernameAvailabilityUseCase extends CheckUsernameAvailabilityUseCasePort {
  constructor(private readonly repository: UsernameRepositoryPort) {
    super();
  }

  async execute(username: string, requesterUserId?: string): Promise<UsernameAvailability> {
    const normalized = username.trim().toLowerCase();

    if (!isValidUsernameFormat(normalized)) {
      return { username: normalized, available: false, reason: 'invalid_format' };
    }

    if (RESERVED_USERNAMES_SET.has(normalized)) {
      return { username: normalized, available: false, reason: 'reserved' };
    }

    const taken = await this.repository.isUsernameTaken(normalized, requesterUserId);
    if (taken) return { username: normalized, available: false, reason: 'taken' };

    return { username: normalized, available: true };
  }
}
