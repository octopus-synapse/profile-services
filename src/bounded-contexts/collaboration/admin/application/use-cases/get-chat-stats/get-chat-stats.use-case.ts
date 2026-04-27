/**
 * Returns the admin chat overview. The "active" window is hardcoded
 * at 30 days back from now — the only piece of business policy in
 * this thin orchestrator. Anything else is delegated to the port.
 */

import {
  type AdminChatStats,
  AdminChatRepositoryPort,
} from '../../../domain/ports/admin-chat.repository.port';

const ACTIVE_WINDOW_DAYS = 30;

export class GetChatStatsUseCase {
  constructor(private readonly repository: AdminChatRepositoryPort) {}

  async execute(): Promise<AdminChatStats> {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return this.repository.getStats(activeSince);
  }
}
