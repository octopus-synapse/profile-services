/**
 * Outbound port for admin chat reads. Surfaces the two queries the
 * controller needs (stats overview + paginated conversation list).
 *
 * `since` for the stats window stays in the use case so tests can
 * pin the clock; the port just runs the query for whatever cutoff
 * the use case decides on.
 */

import type { PaginatedResult } from '@/shared-kernel/database';

export interface AdminChatStats {
  readonly totalConversations: number;
  readonly totalMessages: number;
  readonly activeConversations: number;
  readonly activeChatUsers: number;
}

export interface AdminChatParticipant {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
}

export interface AdminChatConversationView {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly participant1Id: string;
  readonly participant2Id: string;
  readonly participant1: AdminChatParticipant;
  readonly participant2: AdminChatParticipant;
  readonly lastMessageContent: string | null;
  readonly lastMessageAt: Date | null;
  readonly lastMessageSenderId: string | null;
}

export interface ListConversationsQuery {
  readonly page?: number;
  readonly pageSize?: number;
}

export abstract class AdminChatRepositoryPort {
  abstract getStats(activeSince: Date): Promise<AdminChatStats>;
  abstract listConversations(
    query: ListConversationsQuery,
  ): Promise<PaginatedResult<AdminChatConversationView>>;
}
