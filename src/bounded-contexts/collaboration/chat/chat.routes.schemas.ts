/**
 * Route descriptors for the chat BC. Replaces `ChatController`,
 * `BlockController`, and `ChatPreferenceController`.
 *
 * The chat BC has three collaborating dependencies (chat use-cases,
 * block use-cases, and a couple of stateless services). Rather than
 * synthesise three separate controller groups, we expose a single
 * `ChatHttpBundle` DI token that aggregates them — keeps the wiring
 * (one `synthesizeRouteControllers` call) and the routes file (one
 * exported array) symmetrical with the rest of the codebase.
 */

import { z } from 'zod';
import { BlockUseCases } from './application/ports/block.port';
import { ChatUseCases } from './application/ports/chat.port';
import {
  BlockedUserResponseSchema,
  ConversationResponseSchema,
  MessageResponseSchema,
  PaginatedConversationsResponseSchema,
  PaginatedMessagesResponseSchema,
} from './schemas/chat.schema';
import type { ChatPreferenceService } from './services/chat-preference.service';
import type { ChatUserSearchService } from './services/user-search.service';

/**
 * Aggregated bundle for the chat BC's HTTP surface. Composed in
 * `chat.module.ts` from the BC's individual providers.
 */
export abstract class ChatHttpBundle {
  abstract readonly chat: ChatUseCases;
  abstract readonly block: BlockUseCases;
  abstract readonly preferences: ChatPreferenceService;
  abstract readonly search: ChatUserSearchService;
}

export const ConversationIdParam = z.object({ conversationId: z.string() });
export const UserIdParam = z.object({ userId: z.string() });

export const SearchQuerySchema = z.object({ q: z.string().optional() });

export const SetPinSchema = z.object({ pinned: z.boolean() });
export const SetMuteSchema = z.object({
  muted: z.boolean(),
  mutedUntil: z.string().datetime().optional(),
});

// ─── Response schemas ──────────────────────────────────────────────
export const SendMessageResponseSchema = z.object({ message: MessageResponseSchema });

export const GetConversationsResponseSchema = z.object({
  conversations: PaginatedConversationsResponseSchema,
});

export const GetConversationResponseSchema = z.object({ conversation: ConversationResponseSchema });

export const GetMessagesResponseSchema = z.object({ messages: PaginatedMessagesResponseSchema });

export const MarkConversationReadResponseSchema = z.object({ count: z.number().int() });

export const ConversationWithUserResponseSchema = z.union([
  z.object({ conversationId: z.null() }),
  z.object({ conversationId: z.string(), conversation: ConversationResponseSchema }),
]);

export const UserSearchResultSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const ChatUsersSearchResponseSchema = z.object({
  users: z.array(UserSearchResultSchema),
});

export const SetPinResponseSchema = z.object({ pinned: z.boolean() });

export const SetMuteResponseSchema = z.object({
  muted: z.boolean(),
  mutedUntil: z.string().datetime().nullable(),
});

export const BlockUserResponseSchemaWrapped = z.object({ block: BlockedUserResponseSchema });

export const BlockedUsersResponseSchema = z.object({
  blockedUsers: z.array(BlockedUserResponseSchema),
});

export const BlockStatusResponseSchema = z.object({ isBlocked: z.boolean() });
