import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { JwtPort } from '@/shared-kernel/auth';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  WebSocketNamespace,
  type WebSocketPort,
  type WsAuthenticator,
  type WsConnectionHandler,
  type WsHandshake,
  type WsMessageHandler,
} from '@/shared-kernel/websocket/websocket.port';
import { ChatUseCases } from '../application/ports/chat.port';
import { InMemoryChatCacheService, InMemoryConversationRepository } from '../testing';
import { type ChatRealtimePort, registerChatWebSocketHandlers } from './chat-handlers';

// ----------------------------------------------------------------------------
// Fakes
// ----------------------------------------------------------------------------

interface FakeNamespaceState {
  readonly messageHandlers: Map<string, WsMessageHandler>;
  readonly connectHandlers: WsConnectionHandler[];
  readonly disconnectHandlers: WsConnectionHandler[];
  /** Records every emit (toUser/toRoom/toRoomExcept) for assertions. */
  readonly emits: Array<{
    kind: 'user' | 'room' | 'roomExcept';
    target: string;
    fromSocketId?: string;
    event: string;
    payload: unknown;
  }>;
  /** socketId → set of room names. */
  readonly rooms: Map<string, Set<string>>;
}

function createFakeNamespace(): { handle: WebSocketNamespace; state: FakeNamespaceState } {
  const state: FakeNamespaceState = {
    messageHandlers: new Map(),
    connectHandlers: [],
    disconnectHandlers: [],
    emits: [],
    rooms: new Map(),
  };

  const handle: WebSocketNamespace = new (class extends WebSocketNamespace {
    on<TPayload, TReply>(event: string, handler: WsMessageHandler<TPayload, TReply>): void {
      state.messageHandlers.set(event, handler as WsMessageHandler);
    }
    onConnect(handler: WsConnectionHandler): void {
      state.connectHandlers.push(handler);
    }
    onDisconnect(handler: WsConnectionHandler): void {
      state.disconnectHandlers.push(handler);
    }
    toUser(userId: string, event: string, payload: unknown): void {
      state.emits.push({ kind: 'user', target: userId, event, payload });
    }
    toRoom(room: string, event: string, payload: unknown): void {
      state.emits.push({ kind: 'room', target: room, event, payload });
    }
    toRoomExcept(socketId: string, room: string, event: string, payload: unknown): void {
      state.emits.push({
        kind: 'roomExcept',
        target: room,
        fromSocketId: socketId,
        event,
        payload,
      });
    }
    async joinRoom(socketId: string, room: string): Promise<void> {
      const set = state.rooms.get(socketId) ?? new Set<string>();
      set.add(room);
      state.rooms.set(socketId, set);
    }
    async leaveRoom(socketId: string, room: string): Promise<void> {
      state.rooms.get(socketId)?.delete(room);
    }
  })();

  return { handle, state };
}

interface FakeWsPortControls {
  port: WebSocketPort;
  authenticate: WsAuthenticator;
  state: FakeNamespaceState;
}

function createFakeWsPort(): FakeWsPortControls {
  const { handle, state } = createFakeNamespace();
  // biome-ignore lint/suspicious/noExplicitAny: filled lazily below
  const ctl = { state } as any;
  const port: WebSocketPort = {
    namespace(_name: string, authenticate: WsAuthenticator) {
      ctl.authenticate = authenticate;
      return handle;
    },
  };
  ctl.port = port;
  return ctl as FakeWsPortControls;
}

function makeHandshake(overrides: Partial<WsHandshake> = {}): WsHandshake {
  return {
    headers: {},
    cookies: {},
    auth: {},
    query: {},
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('registerChatWebSocketHandlers', () => {
  let conversationRepo: InMemoryConversationRepository;
  let chatCache: InMemoryChatCacheService;
  let jwt: JwtPort;
  let chat: ChatUseCases;
  let sendMessage: ReturnType<typeof mock>;
  let markRead: ReturnType<typeof mock>;
  let verifyAsync: ReturnType<typeof mock>;
  let wsCtl: FakeWsPortControls;
  let realtime: ChatRealtimePort;

  beforeEach(() => {
    conversationRepo = new InMemoryConversationRepository();
    chatCache = new InMemoryChatCacheService();

    conversationRepo.seedUser({ id: 'user-1', name: 'User 1', username: 'user1' });
    conversationRepo.seedUser({ id: 'user-2', name: 'User 2', username: 'user2' });
    conversationRepo.seedConversation({
      id: 'conv-1',
      participant1Id: 'user-1',
      participant2Id: 'user-2',
    });

    verifyAsync = mock(() => Promise.resolve({ sub: 'user-1' }));
    jwt = { verifyAsync, verify: mock(() => ({ sub: 'user-1' })) } as unknown as JwtPort;

    sendMessage = mock();
    markRead = mock();
    chat = {
      sendMessageToConversationUseCase: { execute: sendMessage },
      markConversationReadUseCase: { execute: markRead },
    } as unknown as ChatUseCases;

    wsCtl = createFakeWsPort();

    realtime = registerChatWebSocketHandlers({
      ws: wsCtl.port,
      jwt,
      chat,
      // biome-ignore lint/suspicious/noExplicitAny: fake repo shape
      conversationRepo: conversationRepo as any,
      // biome-ignore lint/suspicious/noExplicitAny: fake cache shape
      chatCache: chatCache as any,
      logger: stubLogger,
    });
  });

  // -------------------------- authenticate ---------------------------------

  describe('authenticate', () => {
    it('returns userId from session cookie', async () => {
      const userId = await wsCtl.authenticate(
        makeHandshake({ cookies: { session: 'jwt-cookie' } }),
      );
      expect(userId).toBe('user-1');
      expect(verifyAsync).toHaveBeenCalledWith('jwt-cookie');
    });

    it('returns userId from auth.token when no cookie', async () => {
      const userId = await wsCtl.authenticate(makeHandshake({ auth: { token: 'jwt-auth' } }));
      expect(userId).toBe('user-1');
      expect(verifyAsync).toHaveBeenCalledWith('jwt-auth');
    });

    it('returns userId from query string', async () => {
      const userId = await wsCtl.authenticate(makeHandshake({ query: { token: 'jwt-query' } }));
      expect(userId).toBe('user-1');
    });

    it('returns userId from Authorization Bearer header', async () => {
      const userId = await wsCtl.authenticate(
        makeHandshake({ headers: { authorization: 'Bearer jwt-header' } }),
      );
      expect(userId).toBe('user-1');
      expect(verifyAsync).toHaveBeenCalledWith('jwt-header');
    });

    it('prioritises cookie over other token sources', async () => {
      await wsCtl.authenticate(
        makeHandshake({
          cookies: { session: 'cookie-token' },
          auth: { token: 'auth-token' },
          query: { token: 'query-token' },
          headers: { authorization: 'Bearer header-token' },
        }),
      );
      expect(verifyAsync).toHaveBeenCalledWith('cookie-token');
    });

    it('returns null when no token is provided', async () => {
      const userId = await wsCtl.authenticate(makeHandshake());
      expect(userId).toBeNull();
      expect(verifyAsync).not.toHaveBeenCalled();
    });

    it('returns null when verification throws', async () => {
      verifyAsync.mockRejectedValueOnce(new Error('expired'));
      const userId = await wsCtl.authenticate(makeHandshake({ cookies: { session: 'expired' } }));
      expect(userId).toBeNull();
    });
  });

  // -------------------------- onConnect ------------------------------------

  describe('onConnect', () => {
    it('joins user room and conversation rooms, sets online status', async () => {
      await wsCtl.state.connectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });

      const rooms = wsCtl.state.rooms.get('sock-1');
      expect(rooms?.has('user:user-1')).toBe(true);
      expect(rooms?.has('conversation:conv-1')).toBe(true);

      const status = await chatCache.getOnlineStatus('user-1');
      expect(status?.isOnline).toBe(true);
    });

    it('marks user online via realtime port', async () => {
      await wsCtl.state.connectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });
      expect(realtime.isUserOnline('user-1')).toBe(true);
    });

    it('broadcasts online status to conversation rooms', async () => {
      await wsCtl.state.connectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });

      // Wait for the void-chained broadcastUserStatus().
      await Promise.resolve();
      await Promise.resolve();

      const statusEmits = wsCtl.state.emits.filter((e) => e.event === 'user:status');
      expect(statusEmits.length).toBeGreaterThan(0);
      expect(statusEmits[0].target).toBe('conversation:conv-1');
      expect(statusEmits[0].payload).toMatchObject({ userId: 'user-1', isOnline: true });
    });
  });

  // -------------------------- onDisconnect ---------------------------------

  describe('onDisconnect', () => {
    it('clears online status when last socket disconnects', async () => {
      await wsCtl.state.connectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });
      expect(realtime.isUserOnline('user-1')).toBe(true);

      await wsCtl.state.disconnectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });
      expect(realtime.isUserOnline('user-1')).toBe(false);

      const status = await chatCache.getOnlineStatus('user-1');
      expect(status?.isOnline).toBe(false);
    });

    it('keeps user online when other sockets remain connected', async () => {
      await wsCtl.state.connectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });
      await wsCtl.state.connectHandlers[0]({ userId: 'user-1', socketId: 'sock-2' });

      await wsCtl.state.disconnectHandlers[0]({ userId: 'user-1', socketId: 'sock-1' });
      expect(realtime.isUserOnline('user-1')).toBe(true);
    });
  });

  // -------------------------- message:send ---------------------------------

  describe('message:send', () => {
    it('returns success and broadcasts message:new', async () => {
      sendMessage.mockResolvedValueOnce({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello',
        createdAt: new Date().toISOString(),
        isRead: false,
      });

      const handler = wsCtl.state.messageHandlers.get('message:send');
      expect(handler).toBeDefined();
      const result = await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1', content: 'Hello' },
      });

      expect(result).toMatchObject({ success: true });
      const emit = wsCtl.state.emits.find((e) => e.event === 'message:new');
      expect(emit?.target).toBe('conversation:conv-1');
    });

    it('returns error when use case throws', async () => {
      sendMessage.mockRejectedValueOnce(new Error('Boom'));
      const handler = wsCtl.state.messageHandlers.get('message:send');

      const result = await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1', content: 'Hello' },
      });

      expect(result).toEqual({ success: false, error: 'Boom' });
    });
  });

  // -------------------------- typing:start ---------------------------------

  describe('typing:start', () => {
    it('broadcasts typing event to conversation excluding sender', async () => {
      const handler = wsCtl.state.messageHandlers.get('typing:start');
      await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });

      const emit = wsCtl.state.emits.find((e) => e.event === 'typing');
      expect(emit?.kind).toBe('roomExcept');
      expect(emit?.fromSocketId).toBe('sock-1');
      expect(emit?.target).toBe('conversation:conv-1');
      expect(emit?.payload).toMatchObject({
        conversationId: 'conv-1',
        userId: 'user-1',
        isTyping: true,
      });
    });

    it('does not broadcast when user is not a participant', async () => {
      const handler = wsCtl.state.messageHandlers.get('typing:start');
      await handler?.({
        userId: 'user-3',
        socketId: 'sock-3',
        payload: { conversationId: 'conv-1' },
      });

      expect(wsCtl.state.emits.find((e) => e.event === 'typing')).toBeUndefined();
    });
  });

  // -------------------------- typing:stop ----------------------------------

  describe('typing:stop', () => {
    it('broadcasts typing stop excluding sender', () => {
      const handler = wsCtl.state.messageHandlers.get('typing:stop');
      handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });

      const emit = wsCtl.state.emits.find(
        (e) => e.event === 'typing' && (e.payload as { isTyping: boolean }).isTyping === false,
      );
      expect(emit?.kind).toBe('roomExcept');
      expect(emit?.target).toBe('conversation:conv-1');
    });
  });

  // -------------------------- message:read ---------------------------------

  describe('message:read', () => {
    it('marks read and broadcasts messages:read', async () => {
      markRead.mockResolvedValueOnce({ count: 3 });
      const handler = wsCtl.state.messageHandlers.get('message:read');
      const result = await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });

      expect(result).toEqual({ success: true });
      expect(markRead).toHaveBeenCalledWith('user-1', 'conv-1');

      const emit = wsCtl.state.emits.find((e) => e.event === 'messages:read');
      expect(emit?.kind).toBe('roomExcept');
      expect(emit?.target).toBe('conversation:conv-1');
      expect(emit?.payload).toMatchObject({ conversationId: 'conv-1', readBy: 'user-1' });
    });

    it('returns error when use case throws', async () => {
      markRead.mockRejectedValueOnce(new Error('Not authorized'));
      const handler = wsCtl.state.messageHandlers.get('message:read');
      const result = await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });
      expect(result).toEqual({ success: false, error: 'Not authorized' });
    });
  });

  // -------------------------- conversation:join ----------------------------

  describe('conversation:join', () => {
    it('joins room when user is a participant', async () => {
      const handler = wsCtl.state.messageHandlers.get('conversation:join');
      const result = await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });

      expect(result).toEqual({ success: true });
      expect(wsCtl.state.rooms.get('sock-1')?.has('conversation:conv-1')).toBe(true);
    });

    it('rejects non-participant', async () => {
      const handler = wsCtl.state.messageHandlers.get('conversation:join');
      const result = await handler?.({
        userId: 'user-3',
        socketId: 'sock-3',
        payload: { conversationId: 'conv-1' },
      });
      expect(result).toEqual({ success: false, error: 'Not a participant' });
    });
  });

  // -------------------------- conversation:leave ---------------------------

  describe('conversation:leave', () => {
    it('removes the socket from the conversation room', async () => {
      // Pre-join.
      const join = wsCtl.state.messageHandlers.get('conversation:join');
      await join?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });
      expect(wsCtl.state.rooms.get('sock-1')?.has('conversation:conv-1')).toBe(true);

      const handler = wsCtl.state.messageHandlers.get('conversation:leave');
      const result = await handler?.({
        userId: 'user-1',
        socketId: 'sock-1',
        payload: { conversationId: 'conv-1' },
      });
      expect(result).toEqual({ success: true });
      expect(wsCtl.state.rooms.get('sock-1')?.has('conversation:conv-1')).toBe(false);
    });
  });

  // -------------------------- realtime port --------------------------------

  describe('realtime port', () => {
    it('isUserOnlineCached falls back to cache when no local sockets', async () => {
      chatCache.seedOnlineStatus('user-9', { isOnline: true, lastSeen: new Date().toISOString() });
      expect(await realtime.isUserOnlineCached('user-9')).toBe(true);
    });

    it('isUserOnlineCached returns false when neither local nor cached', async () => {
      expect(await realtime.isUserOnlineCached('nobody')).toBe(false);
    });

    it('notifyUser emits to user-scoped room', () => {
      realtime.notifyUser('user-1', 'ping', { hello: 'world' });
      const emit = wsCtl.state.emits.find((e) => e.event === 'ping');
      expect(emit?.kind).toBe('room');
      expect(emit?.target).toBe('user:user-1');
      expect(emit?.payload).toEqual({ hello: 'world' });
    });
  });
});
