import type { ConnectionUser } from '../../ports/connection.port';
import { ConnectionRepositoryPort } from '../../ports/connection.port';

export class GetConnectionSuggestionsUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(userId: string): Promise<ConnectionUser[]> {
    return this.repository.findSuggestions(userId, 10);
  }
}
