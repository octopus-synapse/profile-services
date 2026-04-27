/**
 * Single-trip dashboard payload assembler.
 *
 * Every value here lives in the database somewhere; the use case
 * stays a thin pass-through over the repository so the controller
 * can keep its constructor short and the in-memory fake stays a
 * one-liner. Aggregation (the parallel fan-out across counts +
 * recent notifications) is the adapter's job, not the use case's.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { MeDashboardPayload } from '../../../domain/entities/me-dashboard';
import { MeDashboardRepositoryPort } from '../../../domain/ports/me-dashboard.repository.port';

const CTX = 'LoadMeDashboardUseCase';

export class LoadMeDashboardUseCase {
  constructor(
    private readonly repository: MeDashboardRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string): Promise<MeDashboardPayload> {
    const payload = await this.repository.loadDashboard(userId);
    this.logger.debug(
      `Loaded dashboard for ${userId} (unread=${payload.counts.unreadNotifications})`,
      CTX,
    );
    return payload;
  }
}
