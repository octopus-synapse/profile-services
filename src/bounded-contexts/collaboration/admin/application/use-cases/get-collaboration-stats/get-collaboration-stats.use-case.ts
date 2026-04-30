/**
 * Returns the admin collaboration stats overview. Pure delegation
 * to the port; no policy lives here.
 */

import {
  AdminCollaborationsRepositoryPort,
  type AdminCollaborationsStats,
} from '../../../domain/ports/admin-collaborations.repository.port';

export class GetCollaborationStatsUseCase {
  constructor(private readonly repository: AdminCollaborationsRepositoryPort) {}

  async execute(): Promise<AdminCollaborationsStats> {
    return this.repository.getStats();
  }
}
