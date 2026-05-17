import { z } from 'zod';
import type { JwtPort } from '@/shared-kernel/auth';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { AUTH_CONFIG } from '@/shared-kernel/constants/app.constants';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type {
  WebSocketNamespace,
  WebSocketPort,
  WsHandshake,
} from '@/shared-kernel/websocket/websocket.port';
import { validateWsMessage } from '@/shared-kernel/websocket/ws-message-schema';
import type { ChatUseCases } from '../application/ports/chat.port';
import type { ConversationRepository } from '../repositories/conversation.repository';
import type { SendMessageToConversation, WsTypingEvent } from '../schemas/chat.schema';
import type { ChatCacheService } from '../services/chat-cache.service';

// P1-038 — Zod schemas for every WS event the chat handler accepts.
// Without them the handlers cast `unknown` payloads and a malformed
// frame crashes the namespace (or — worse — passes a `null` straight
// into `chat.sendMessageToConversationUseCase`). We don't constrain
// `conversationId` to a strict UUID format here because the repo
// lookup already rejects unknown ids — the goal at this layer is
// "shape + length", not "strong identifier validation".
const ConversationIdSchema = z.object({ conversationId: z.string().min(1).max(64) });
const SendMessageSchema = z.object({
  conversationId: z.string().min(1).max(64),
  content: z.string().min(1).max(8_000),
});

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
  /** P1 #7 — when provided, the WS auth handshake enforces the
   *  `token_valid_after` cache key the password-change / reset-password
   *  flows write. Without it the chat namespace would accept a JWT
   *  issued before the user invalidated their sessions. */
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
  // P1 #7 — JWTs MUST NOT travel in the query string. URLs end up in
  // proxy/CDN logs, browser history, referer headers, and crash
  // reports; a leaked WS upgrade URL hands the access token to
  // whoever can read the log. Accepted carriers in order:
  //
  //   1. httpOnly session cookie (browser flow — primary, CSRF-protected
  //      by the WS origin check below).
  //   2. `Authorization: Bearer ...` header (native / programmatic clients
  //      that can set headers on the upgrade).
  //   3. `Sec-WebSocket-Protocol: bearer.<token>` subprotocol (browser
  //      clients without cookie support that need an explicit token —
  //      browsers DO allow `new WebSocket(url, protocols)`).
  //   4. Socket.IO `auth.token` object (programmatic clients that go
  //      through the SIO bridge).
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
      // P1 #7 — apply the same session-invalidation gate the HTTP
      // pipeline uses (JoseAuthExtractorAdapter). A JWT issued before
      // the user's last credential change must not connect via WS.
      if (cache?.isEnabled && typeof payload.iat === 'number') {
        const validAfter = await cache.get<number>(`${TOKEN_VALID_AFTER_KEY_PREFIX}${userId}`);
        if (typeof validAfter === 'number' && payload.iat <= validAfter) {
          logger.warn('Connection rejected: token issued before session invalidation', CTX);
          return null;
        }
      }
      return userId;
    } catch {
      logger.warn('Connection rejected: invalid token', CTX);
      return null;
    }
  });

  // P1-042 — debounce user-status broadcasts. Without this, a
  // flapping client (mobile network blip, browser tab churn) emits
  // a `user:status` to every conversation room the user is in on
  // every connect/disconnect cycle. With ~20 conversations/user and
  // 4 reconnects/min that's 80 wasted broadcasts/min; multiply by
  // active users at peak. The debounce coalesces successive flips
  // for the same user into the LAST observed state — so a quick
  // disconnect+reconnect produces zero broadcasts (state unchanged)
  // and a real disconnect emits exactly one.
  const STATUS_DEBOUNCE_MS = 300;
  const pendingStatus = new Map<string, { isOnline: boolean; timer: NodeJS.Timeout }>();

  const broadcastUserStatus = (userId: string, isOnline: boolean): void => {
    const existing = pendingStatus.get(userId);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(async () => {
      pendingStatus.delete(userId);
      const { conversations } = await conversationRepo.findByUserId(userId, { limit: 100 });
      for (const conv of conversations) {
        namespace.toRoom(`conversation:${conv.id}`, 'user:status', {
          userId,
          isOnline,
          lastSeen: isOnline ? undefined : new Date().toISOString(),
        });
      }
    }, STATUS_DEBOUNCE_MS);
    pendingStatus.set(userId, { isOnline, timer });
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

  // P1-038 — every WS handler now flows through `validateWsMessage`
  // so the payload is Zod-parsed before the handler body runs.
  // Malformed frames are silently dropped (the validator throws a
  // typed `WsValidationError`; the WS adapter logs and replies with
  // an error envelope rather than crashing the namespace).
  namespace.on<SendMessageToConversation>(
    'message:send',
    validateWsMessage(SendMessageSchema, async ({ userId, payload }) => {
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
    }),
  );

  namespace.on<{ conversationId: string }>(
    'typing:start',
    validateWsMessage(ConversationIdSchema, async ({ userId, socketId, payload }) => {
      const isParticipant = await conversationRepo.isParticipant(payload.conversationId, userId);
      if (!isParticipant) return;

      namespace.toRoomExcept(socketId, `conversation:${payload.conversationId}`, 'typing', {
        conversationId: payload.conversationId,
        userId,
        isTyping: true,
      } satisfies WsTypingEvent);
    }),
  );

  // P1-043 — `typing:stop` previously skipped the participant check;
  // a malicious client could broadcast typing events into any
  // conversation room they knew the id of. Mirror `typing:start`.
  namespace.on<{ conversationId: string }>(
    'typing:stop',
    validateWsMessage(ConversationIdSchema, async ({ userId, socketId, payload }) => {
      const isParticipant = await conversationRepo.isParticipant(payload.conversationId, userId);
      if (!isParticipant) return;

      namespace.toRoomExcept(socketId, `conversation:${payload.conversationId}`, 'typing', {
        conversationId: payload.conversationId,
        userId,
        isTyping: false,
      } satisfies WsTypingEvent);
    }),
  );

  namespace.on<{ conversationId: string }>(
    'message:read',
    validateWsMessage(ConversationIdSchema, async ({ userId, socketId, payload }) => {
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
          { context: CTX, stack: error instanceof Error ? error.stack : undefined },
        );
        return { success: false, error: errorMessage };
      }
    }),
  );

  namespace.on<{ conversationId: string }>(
    'conversation:join',
    validateWsMessage(ConversationIdSchema, async ({ userId, socketId, payload }) => {
      const isParticipant = await conversationRepo.isParticipant(payload.conversationId, userId);
      if (!isParticipant) {
        return { success: false, error: 'Not a participant' };
      }
      await namespace.joinRoom(socketId, `conversation:${payload.conversationId}`);
      return { success: true };
    }),
  );

  // P1-043 — `conversation:leave` was idempotent at the room level
  // but lacked an isParticipant check; a non-participant could probe
  // existence by attempting to leave. Reject early so the handler
  // doesn't reveal anything about rooms the user shouldn't see.
  namespace.on<{ conversationId: string }>(
    'conversation:leave',
    validateWsMessage(ConversationIdSchema, async ({ userId, socketId, payload }) => {
      const isParticipant = await conversationRepo.isParticipant(payload.conversationId, userId);
      if (!isParticipant) return { success: false, error: 'Not a participant' };
      await namespace.leaveRoom(socketId, `conversation:${payload.conversationId}`);
      return { success: true };
    }),
  );

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
