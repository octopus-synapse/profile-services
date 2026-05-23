import type { JwtPort } from '@/shared-kernel/auth';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { AUTH_CONFIG } from '@/shared-kernel/constants/app.constants';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type {
  WebSocketNamespace,
  WebSocketPort,
  WsHandshake,
} from '@/shared-kernel/websocket/websocket.port';
import type { ChatUseCases } from '../application/ports/chat.port';
import type { ConversationRepository } from '../repositories/conversation.repository';
import type { SendMessageToConversation, WsTypingEvent } from '../schemas/chat.schema';
import type { ChatCacheService } from '../services/chat-cache.service';

const CTX = 'ChatHandlers';

interface JwtPayload {
  readonly sub: string;
  readonly email?: string;
  readonly iat?: number;
  readonly exp?: number;
  readonly sessionId?: string;
}

export interface ChatHandlersDeps {
  ws: WebSocketPort;
  jwt: JwtPort;
  chat: ChatUseCases;
  conversationRepo: ConversationRepository;
  chatCache: ChatCacheService;
  logger: LoggerPort;
  /** P1 #7 — see chat.handler.ts:ChatHandlersDeps for the rationale. */
  cache?: CachePort;
}

/**
 * Public surface of the chat WebSocket subsystem. Mirrors the API the
 * old `ChatGateway` exposed (presence + targeted notification) so
 * other BCs can keep depending on a single `ChatRealtime` token
 * instead of a Nest gateway class.
 */
export interface ChatRealtimePort {
  readonly namespace: WebSocketNamespace;
  isUserOnline(userId: string): boolean;
  isUserOnlineCached(userId: string): Promise<boolean>;
  notifyUser(userId: string, event: string, data: unknown): void;
}

function extractToken(handshake: WsHandshake): string | null {
  // P1 #7 — see chat.handler.ts:extractToken for the rationale. Query
  // strings are intentionally NOT accepted: URLs land in proxy/CDN
  // logs, browser history, referer headers and crash reports.
  const cookieToken = handshake.cookies[AUTH_CONFIG.SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;

  const authHeader = handshake.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const subprotocol = handshake.headers['sec-websocket-protocol'];
  if (typeof subprotocol === 'string') {
    for (const part of subprotocol.split(',')) {
      const trimmed = part.trim();
      if (trimmed.startsWith('bearer.')) return trimmed.slice('bearer.'.length);
    }
  }

  const authToken = handshake.auth.token;
  if (typeof authToken === 'string' && authToken.length > 0) return authToken;

  return null;
}

const TOKEN_VALID_AFTER_KEY_PREFIX = 'auth:token_valid_after:';

export function registerChatWebSocketHandlers(deps: ChatHandlersDeps): ChatRealtimePort {
  const { ws, jwt, chat, conversationRepo, chatCache, logger, cache } = deps;

  // Local presence map (userId → set of socketIds). The adapter also
  // keeps one for `toUser`, but we expose `isUserOnline` synchronously
  // for callers that need it.
  const userSockets = new Map<string, Set<string>>();

  const trackSocket = (userId: string, socketId: string): void => {
    const set = userSockets.get(userId) ?? new Set<string>();
    set.add(socketId);
    userSockets.set(userId, set);
  };

  const untrackSocket = (userId: string, socketId: string): boolean => {
    const set = userSockets.get(userId);
    if (!set) return false;
    set.delete(socketId);
    if (set.size === 0) {
      userSockets.delete(userId);
      return true;
    }
    return false;
  };

  const namespace = ws.namespace('/chat', async (handshake) => {
    const token = extractToken(handshake);
    if (!token) {
      logger.warn('Connection rejected: no token provided', CTX);
      return null;
    }
    try {
      const payload = await jwt.verifyAsync<JwtPayload>(token);
      const userId = payload.sub;
      if (cache?.isEnabled && typeof payload.iat === 'number') {
        const validAfter = await cache.get<number>(`${TOKEN_VALID_AFTER_KEY_PREFIX}${userId}`);
        if (typeof validAfter === 'number' && payload.iat <= validAfter) {
          logger.warn('Connection rejected: token rejected by session invalidation gate', CTX);
          return null;
        }
      }
      return userId;
    } catch {
      logger.warn('Connection rejected: invalid token', CTX);
      return null;
    }
  });

  const broadcastUserStatus = async (userId: string, isOnline: boolean): Promise<void> => {
    const { conversations } = await conversationRepo.findByUserId(userId, { limit: 100 });
    for (const conv of conversations) {
      namespace.toRoom(`conversation:${conv.id}`, 'user:status', {
        userId,
        isOnline,
        lastSeen: isOnline ? undefined : new Date().toISOString(),
      });
    }
  };

  namespace.onConnect(async ({ userId, socketId }) => {
    trackSocket(userId, socketId);

    await namespace.joinRoom(socketId, `user:${userId}`);

    const { conversations } = await conversationRepo.findByUserId(userId, { limit: 100 });
    for (const conv of conversations) {
      await namespace.joinRoom(socketId, `conversation:${conv.id}`);
    }

    await chatCache.setOnlineStatus(userId, true);
    void broadcastUserStatus(userId, true);

    logger.log(`User ${userId} connected (socket: ${socketId})`, CTX);
  });

  namespace.onDisconnect(async ({ userId, socketId }) => {
    const wentOffline = untrackSocket(userId, socketId);
    if (wentOffline) {
      await chatCache.setOnlineStatus(userId, false);
      void broadcastUserStatus(userId, false);
    }
    logger.log(`User ${userId} disconnected (socket: ${socketId})`, CTX);
  });

  namespace.on<SendMessageToConversation>('message:send', async ({ userId, payload }) => {
    try {
      const message = await chat.sendMessageToConversationUseCase.execute(
        userId,
        payload.conversationId,
        payload.content,
      );
      namespace.toRoom(`conversation:${payload.conversationId}`, 'message:new', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
        isRead: message.isRead,
      });
      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send message in ${payload.conversationId}: ${errorMessage}`, {
        context: CTX,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return { success: false, error: errorMessage };
    }
  });

  namespace.on<{ conversationId: string }>(
    'typing:start',
    async ({ userId, socketId, payload }) => {
      const isParticipant = await conversationRepo.isParticipant(payload.conversationId, userId);
      if (!isParticipant) return;

      namespace.toRoomExcept(socketId, `conversation:${payload.conversationId}`, 'typing', {
        conversationId: payload.conversationId,
        userId,
        isTyping: true,
      } satisfies WsTypingEvent);
    },
  );

  namespace.on<{ conversationId: string }>('typing:stop', ({ userId, socketId, payload }) => {
    namespace.toRoomExcept(socketId, `conversation:${payload.conversationId}`, 'typing', {
      conversationId: payload.conversationId,
      userId,
      isTyping: false,
    } satisfies WsTypingEvent);
  });

  namespace.on<{ conversationId: string }>(
    'message:read',
    async ({ userId, socketId, payload }) => {
      try {
        await chat.markConversationReadUseCase.execute(userId, payload.conversationId);
        namespace.toRoomExcept(
          socketId,
          `conversation:${payload.conversationId}`,
          'messages:read',
          {
            conversationId: payload.conversationId,
            readBy: userId,
            readAt: new Date().toISOString(),
          },
        );
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          `Failed to mark conversation ${payload.conversationId} read: ${errorMessage}`,
          {
            context: CTX,
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        return { success: false, error: errorMessage };
      }
    },
  );

  namespace.on<{ conversationId: string }>(
    'conversation:join',
    async ({ userId, socketId, payload }) => {
      const isParticipant = await conversationRepo.isParticipant(payload.conversationId, userId);
      if (!isParticipant) {
        return { success: false, error: 'Not a participant' };
      }
      await namespace.joinRoom(socketId, `conversation:${payload.conversationId}`);
      return { success: true };
    },
  );

  namespace.on<{ conversationId: string }>('conversation:leave', async ({ socketId, payload }) => {
    await namespace.leaveRoom(socketId, `conversation:${payload.conversationId}`);
    return { success: true };
  });

  const isUserOnline = (userId: string): boolean => {
    const set = userSockets.get(userId);
    return set ? set.size > 0 : false;
  };

  return {
    namespace,
    isUserOnline,
    async isUserOnlineCached(userId: string): Promise<boolean> {
      if (isUserOnline(userId)) return true;
      const status = await chatCache.getOnlineStatus(userId);
      return status?.isOnline ?? false;
    },
    notifyUser(userId, event, data) {
      namespace.toRoom(`user:${userId}`, event, data);
    },
  };
}
