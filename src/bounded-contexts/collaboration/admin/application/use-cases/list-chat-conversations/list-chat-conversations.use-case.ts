/**
 * Paginated list of chat conversations for the admin surface. The
 * use case is a thin pass-through to the port — pagination defaults
 * live in the shared `paginate` helper inside the adapter.
 */

import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminChatConversationView,
  AdminChatRepositoryPort,
} from '../../../domain/ports/admin-chat.repository.port';

export interface ListChatConversationsInput {
  readonly page?: number;
  readonly pageSize?: number;
}

export class ListChatConversationsUseCase {
  constructor(private readonly repository: AdminChatRepositoryPort) {}

  async execute(query: ListChatConversationsInput): Promise<PaginatedResult<AdminChatConversationView>> {
    return this.repository.listConversations(query);
  }
}
