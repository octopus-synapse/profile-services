import type { ConnectionRepositoryPort, ConnectionUser } from '../../ports/connection.port';

export class GetConnectionSuggestionsUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(userId: string): Promise<ConnectionUser[]> {
    return this.repository.findSuggestions(userId, 10);
  }
}
