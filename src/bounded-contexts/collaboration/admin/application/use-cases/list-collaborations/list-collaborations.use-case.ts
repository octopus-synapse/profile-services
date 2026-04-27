/**
 * Paginated list of resume collaborator records for the admin
 * surface. Pure delegation to the port.
 */

import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminCollaborationView,
  AdminCollaborationsRepositoryPort,
} from '../../../domain/ports/admin-collaborations.repository.port';

export interface ListCollaborationsInput {
  readonly page?: number;
  readonly pageSize?: number;
}

export class ListCollaborationsUseCase {
  constructor(private readonly repository: AdminCollaborationsRepositoryPort) {}

  async execute(query: ListCollaborationsInput): Promise<PaginatedResult<AdminCollaborationView>> {
    return this.repository.listCollaborations(query);
  }
}
