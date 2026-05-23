/**
 * Builds the permission-aware navigation tree for a viewer.
 *
 * Reads the user's active permission grants through the repository
 * port, then hands them to the pure `buildMenu` helper. The use case
 * orchestrates I/O and pure logic without knowing about Prisma or
 * Nest — both layers are swappable from `ui-metadata.module.ts`.
 */

import type { LoggerPort } from '@/shared-kernel';
import { MeDashboardRepositoryPort } from '../../../domain/ports/me-dashboard.repository.port';
import { buildMenu, type MenuNode } from '../../services/menu.builder';

const CTX = 'GetUserMenuUseCase';

export class GetUserMenuUseCase {
  constructor(
    private readonly repository: MeDashboardRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string): Promise<MenuNode[]> {
    const grants = await this.repository.listActivePermissionGrants(userId);
    this.logger.debug(`Built menu for ${userId} with ${grants.length} grants`, CTX);
    return buildMenu(grants);
  }
}
