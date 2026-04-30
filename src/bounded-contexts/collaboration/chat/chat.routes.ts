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
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { BlockUseCases } from './application/ports/block.port';
import { ChatUseCases } from './application/ports/chat.port';
import {
  GetConversationsQuerySchema as GetConversationsRequestQuerySchema,
  GetMessagesQuerySchema as GetMessagesRequestQuerySchema,
  SendMessageSchema,
  SendMessageToConversationSchema,
} from './dto/chat-request.dto';
import { BlockUserSchema } from './schemas/chat.schema';
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

const ConversationIdParam = z.object({ conversationId: z.string() });
const UserIdParam = z.object({ userId: z.string() });

const SearchQuerySchema = z.object({ q: z.string().optional() });

const SetPinSchema = z.object({ pinned: z.boolean() });
const SetMuteSchema = z.object({
  muted: z.boolean(),
  mutedUntil: z.string().datetime().optional(),
});

export const chatRoutes: ReadonlyArray<Route<ChatHttpBundle>> = [
  // ─── Chat: messaging + conversations ───────────────────────────────
  {
    method: 'POST',
    path: '/v1/chat/messages',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    body: SendMessageSchema,
    openapi: { summary: 'Send a message to a user', tags: ['chat'], description: 'Chat API' },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const dto = ctx.body as z.infer<typeof SendMessageSchema>;
      const message = await bundle.chat.sendMessageUseCase.execute(ctx.user!.userId, dto);
      return { message };
    },
  },
  {
    method: 'POST',
    path: '/v1/chat/conversations/:conversationId/messages',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: ConversationIdParam,
    body: SendMessageToConversationSchema,
    openapi: {
      summary: 'Send a message to an existing conversation',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { conversationId } = ctx.params as { conversationId: string };
      const body = ctx.body as { content: string };
      const message = await bundle.chat.sendMessageToConversationUseCase.execute(
        ctx.user!.userId,
        conversationId,
        body.content,
      );
      return { message };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/conversations',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    query: GetConversationsRequestQuerySchema,
    openapi: {
      summary: 'Get all conversations for the current user',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const query = ctx.query as unknown as z.infer<typeof GetConversationsRequestQuerySchema>;
      const conversations = await bundle.chat.getConversationsUseCase.execute(
        ctx.user!.userId,
        query,
      );
      return { conversations };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/conversations/:conversationId',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: ConversationIdParam,
    openapi: {
      summary: 'Get a single conversation',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { conversationId } = ctx.params as { conversationId: string };
      const conversation = await bundle.chat.getConversationUseCase.execute(
        ctx.user!.userId,
        conversationId,
      );
      return { conversation };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/conversations/:conversationId/messages',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: ConversationIdParam,
    query: GetMessagesRequestQuerySchema,
    openapi: {
      summary: 'Get messages for a conversation',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { conversationId } = ctx.params as { conversationId: string };
      const query = ctx.query as unknown as z.infer<typeof GetMessagesRequestQuerySchema>;
      const messages = await bundle.chat.getMessagesUseCase.execute(ctx.user!.userId, {
        conversationId,
        cursor: query.cursor,
        limit: query.limit ?? 50,
      });
      return { messages };
    },
  },
  {
    method: 'POST',
    path: '/v1/chat/conversations/:conversationId/read',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: ConversationIdParam,
    openapi: {
      summary: 'Mark all messages in a conversation as read',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { conversationId } = ctx.params as { conversationId: string };
      const result = await bundle.chat.markConversationReadUseCase.execute(
        ctx.user!.userId,
        conversationId,
      );
      return { count: result.count };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/unread',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    openapi: {
      summary: 'Get unread message count',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const unread = await bundle.chat.getUnreadCountUseCase.execute(ctx.user!.userId);
      return {
        success: true,
        data: { totalUnread: unread.totalUnread, byConversation: unread.byConversation },
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/conversation-with/:userId',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: UserIdParam,
    openapi: {
      summary: 'Get or create conversation with a user',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const conversationId = await bundle.chat.getConversationIdUseCase.execute(
        ctx.user!.userId,
        userId,
      );
      if (!conversationId) {
        return { conversationId: null };
      }
      const conversation = await bundle.chat.getConversationUseCase.execute(
        ctx.user!.userId,
        conversationId,
      );
      return { conversationId, conversation };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/users/search',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    query: SearchQuerySchema,
    openapi: {
      summary: 'Search users to start a conversation',
      tags: ['chat'],
      description: 'Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { q } = ctx.query as { q?: string };
      const users = await bundle.search.search(q ?? '', ctx.user!.userId);
      return { users };
    },
  },

  // ─── Chat preferences (pin / mute) ─────────────────────────────────
  {
    method: 'POST',
    path: '/v1/chat/conversations/:conversationId/preferences/pin',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: ConversationIdParam,
    body: SetPinSchema,
    openapi: {
      summary: 'Pin / unpin a conversation for the current user.',
      tags: ['chat'],
      description: 'Conversation preferences',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { conversationId } = ctx.params as { conversationId: string };
      const body = ctx.body as z.infer<typeof SetPinSchema>;
      await bundle.preferences.setPin(conversationId, ctx.user!.userId, body.pinned);
      return { pinned: body.pinned };
    },
  },
  {
    method: 'POST',
    path: '/v1/chat/conversations/:conversationId/preferences/mute',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: ConversationIdParam,
    body: SetMuteSchema,
    openapi: {
      summary: 'Mute / unmute notifications for a conversation.',
      tags: ['chat'],
      description: 'Conversation preferences',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { conversationId } = ctx.params as { conversationId: string };
      const body = ctx.body as z.infer<typeof SetMuteSchema>;
      const result = await bundle.preferences.setMute(
        conversationId,
        ctx.user!.userId,
        body.muted,
        body.mutedUntil,
      );
      return result;
    },
  },

  // ─── Block users ───────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/v1/chat/blocked',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    body: BlockUserSchema,
    openapi: {
      summary: 'Block a user',
      tags: ['chat---block-users'],
      description: 'Chat Block Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const dto = ctx.body as z.infer<typeof BlockUserSchema>;
      const block = await bundle.block.blockUserUseCase.execute(ctx.user!.userId, dto);
      return { block };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/chat/blocked/:userId',
    statusCode: 204,
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: UserIdParam,
    openapi: {
      summary: 'Unblock a user',
      tags: ['chat---block-users'],
      description: 'Chat Block Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      await bundle.block.unblockUserUseCase.execute(ctx.user!.userId, userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/blocked',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    openapi: {
      summary: 'Get all blocked users',
      tags: ['chat---block-users'],
      description: 'Chat Block Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const blockedUsers = await bundle.block.getBlockedUsersUseCase.execute(ctx.user!.userId);
      return { blockedUsers };
    },
  },
  {
    method: 'GET',
    path: '/v1/chat/blocked/:userId/status',
    auth: { kind: 'jwt' },
    permission: Permission.CHAT_USE,
    params: UserIdParam,
    openapi: {
      summary: 'Check if a user is blocked',
      tags: ['chat---block-users'],
      description: 'Chat Block Users API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const isBlocked = await bundle.block.checkBlockStatusUseCase.execute(
        ctx.user!.userId,
        userId,
      );
      return { isBlocked };
    },
  },
];
