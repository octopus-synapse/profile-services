/**
 * Bundle token for the admin-collaboration BC. Doubles as the TypeScript
 * shape and the Nest DI token. Composition lives in
 * `admin-collaboration.composition.ts` — Nest-free.
 */

import type { GetChatStatsUseCase } from '../use-cases/get-chat-stats/get-chat-stats.use-case';
import type { GetCollaborationStatsUseCase } from '../use-cases/get-collaboration-stats/get-collaboration-stats.use-case';
import type { ListChatConversationsUseCase } from '../use-cases/list-chat-conversations/list-chat-conversations.use-case';
import type { ListCollaborationsUseCase } from '../use-cases/list-collaborations/list-collaborations.use-case';

export abstract class AdminCollaborationUseCases {
  abstract readonly getChatStats: GetChatStatsUseCase;
  abstract readonly listChatConversations: ListChatConversationsUseCase;
  abstract readonly getCollaborationStats: GetCollaborationStatsUseCase;
  abstract readonly listCollaborations: ListCollaborationsUseCase;
}
