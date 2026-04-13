import type { ConnectionRepositoryPort } from '../../ports/connection.port';

export class CheckConnectedUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(userA: string, userB: string): Promise<boolean> {
    const connection = await this.repository.findConnectionBetween(userA, userB);
    return connection !== null && connection.status === 'ACCEPTED';
  }
}
