/**
 * In-memory test doubles for the admin chat / collaboration ports.
 *
 * Tests seed view rows and the helpers paginate them in-process; the
 * "active" stats let a test pin its own counts without having to
 * generate a thousand fake messages.
 */

import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminChatConversationView,
  AdminChatRepositoryPort,
  type AdminChatStats,
  type ListConversationsQuery,
} from '../domain/ports/admin-chat.repository.port';
import {
  AdminCollaborationsRepositoryPort,
  type AdminCollaborationsStats,
  type AdminCollaborationView,
  type ListCollaborationsQuery,
} from '../domain/ports/admin-collaborations.repository.port';

function paginateInMemory<T>(
  items: T[],
  query: { page?: number; pageSize?: number },
): PaginatedResult<T> {
  const page = query.page ?? 1;
  const limit = query.pageSize ?? 20;
  const total = items.length;
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    items: slice,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

export class InMemoryAdminChatRepository extends AdminChatRepositoryPort {
  private stats: AdminChatStats = {
    totalConversations: 0,
    totalMessages: 0,
    activeConversations: 0,
    activeChatUsers: 0,
  };
  private conversations: AdminChatConversationView[] = [];
  lastActiveSince: Date | null = null;

  seedStats(stats: Partial<AdminChatStats>): void {
    this.stats = { ...this.stats, ...stats };
  }

  seedConversations(rows: AdminChatConversationView[]): void {
    this.conversations = rows;
  }

  async getStats(activeSince: Date): Promise<AdminChatStats> {
    this.lastActiveSince = activeSince;
    return this.stats;
  }

  async listConversations(query: ListConversationsQuery) {
    return paginateInMemory(this.conversations, query);
  }
}

export class InMemoryAdminCollaborationsRepository extends AdminCollaborationsRepositoryPort {
  private stats: AdminCollaborationsStats = { totalCollaborations: 0, byRole: [] };
  private rows: AdminCollaborationView[] = [];

  seedStats(stats: Partial<AdminCollaborationsStats>): void {
    this.stats = { ...this.stats, ...stats };
  }

  seedRows(rows: AdminCollaborationView[]): void {
    this.rows = rows;
  }

  async getStats(): Promise<AdminCollaborationsStats> {
    return this.stats;
  }

  async listCollaborations(query: ListCollaborationsQuery) {
    return paginateInMemory(this.rows, query);
  }

  async findCollaborator(resumeId: string, userId: string): Promise<{ id: string } | null> {
    const found = this.rows.find((r) => r.resumeId === resumeId && r.userId === userId);
    return found ? { id: found.id } : null;
  }

  async removeCollaborator(resumeId: string, userId: string): Promise<void> {
    this.rows = this.rows.filter((r) => !(r.resumeId === resumeId && r.userId === userId));
  }
}
