import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, type Socket } from 'socket.io';
import {
  WebSocketNamespace,
  type WebSocketNamespace as WebSocketNamespaceType,
  WebSocketPort,
  type WsAuthenticator,
  type WsConnectionHandler,
  type WsHandshake,
  type WsMessageHandler,
} from '@/shared-kernel/websocket/websocket.port';

interface NamespaceState {
  readonly authenticate: WsAuthenticator;
  readonly messageHandlers: Map<string, WsMessageHandler>;
  readonly connectHandlers: WsConnectionHandler[];
  readonly disconnectHandlers: WsConnectionHandler[];
  /** userId → set of socketIds */
  readonly userSockets: Map<string, Set<string>>;
}

/**
 * Adapter that implements `WebSocketPort` on top of Socket.IO. The
 * Nest gateway shim (`NestSocketIOServerBinder`) provides the
 * underlying `io.Server`; once `bindServer(...)` runs we wire any
 * namespace already registered. Namespaces registered before
 * `bindServer` are queued and wired on `bindServer`.
 */
@Injectable()
export class SocketIOWebSocketAdapter extends WebSocketPort {
  private server?: Server;
  private readonly namespaces = new Map<string, NamespaceState>();

  /** Called by the Nest gateway shim once the io.Server is available. */
  bindServer(server: Server): void {
    this.server = server;
    for (const [name, state] of this.namespaces) {
      this.wireNamespace(name, state);
    }
  }

  namespace(name: string, authenticate: WsAuthenticator): WebSocketNamespaceType {
    const state: NamespaceState = {
      authenticate,
      messageHandlers: new Map(),
      connectHandlers: [],
      disconnectHandlers: [],
      userSockets: new Map(),
    };
    this.namespaces.set(name, state);
    if (this.server) this.wireNamespace(name, state);

    const adapter = this;
    const handle: WebSocketNamespaceType = new (class extends WebSocketNamespace {
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
        const sockets = state.userSockets.get(userId);
        if (!sockets || !adapter.server) return;
        for (const sid of sockets) {
          adapter.server.of(name).to(sid).emit(event, payload);
        }
      }
      toRoom(room: string, event: string, payload: unknown): void {
        adapter.server?.of(name).to(room).emit(event, payload);
      }
      toRoomExcept(socketId: string, room: string, event: string, payload: unknown): void {
        const sock = adapter.server?.of(name).sockets.get(socketId);
        if (sock) {
          sock.to(room).emit(event, payload);
          return;
        }
        // Fallback: fan out to room (sender no longer connected).
        adapter.server?.of(name).to(room).emit(event, payload);
      }
      async joinRoom(socketId: string, room: string): Promise<void> {
        const sock = adapter.server?.of(name).sockets.get(socketId);
        await sock?.join(room);
      }
      async leaveRoom(socketId: string, room: string): Promise<void> {
        const sock = adapter.server?.of(name).sockets.get(socketId);
        await sock?.leave(room);
      }
    })();
    return handle;
  }

  private wireNamespace(name: string, state: NamespaceState): void {
    if (!this.server) return;
    const ns = this.server.of(name);
    ns.on('connection', async (socket: Socket) => {
      const handshake: WsHandshake = {
        headers: socket.handshake.headers as WsHandshake['headers'],
        cookies: this.parseCookies(socket.handshake.headers.cookie),
        auth: (socket.handshake.auth ?? {}) as Record<string, unknown>,
        query: socket.handshake.query as WsHandshake['query'],
      };
      const userId = await state.authenticate(handshake);
      if (!userId) {
        socket.disconnect();
        return;
      }
      this.trackUserSocket(state, userId, socket.id);
      const conn = { userId, socketId: socket.id };
      for (const h of state.connectHandlers) await h(conn);

      for (const [event, handler] of state.messageHandlers) {
        socket.on(event, async (payload: unknown, ack?: (reply: unknown) => void) => {
          try {
            const reply = await handler({ userId, socketId: socket.id, payload });
            if (ack && reply !== undefined) ack(reply);
          } catch (err) {
            if (ack) ack({ error: err instanceof Error ? err.message : 'Unknown error' });
          }
        });
      }

      socket.on('disconnect', async () => {
        this.untrackUserSocket(state, userId, socket.id);
        for (const h of state.disconnectHandlers) await h(conn);
      });
    });
  }

  private trackUserSocket(state: NamespaceState, userId: string, socketId: string): void {
    const set = state.userSockets.get(userId) ?? new Set<string>();
    set.add(socketId);
    state.userSockets.set(userId, set);
  }

  private untrackUserSocket(state: NamespaceState, userId: string, socketId: string): void {
    const set = state.userSockets.get(userId);
    set?.delete(socketId);
    if (set && set.size === 0) state.userSockets.delete(userId);
  }

  private parseCookies(header: string | undefined): Record<string, string | undefined> {
    if (!header) return {};
    const out: Record<string, string> = {};
    for (const pair of header.split(';')) {
      const trimmed = pair.trim();
      const eq = trimmed.indexOf('=');
      if (eq > 0) out[trimmed.slice(0, eq)] = decodeURIComponent(trimmed.slice(eq + 1));
    }
    return out;
  }
}

/**
 * Nest-side shim that exposes the io.Server via a tiny gateway class.
 * The gateway lives ONLY to capture the server handle and hand it to
 * the adapter. All actual handlers live in the BCs that called
 * `WebSocketPort.namespace(...)`.
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
@Injectable()
export class NestSocketIOServerBinder implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly adapter: SocketIOWebSocketAdapter) {}

  // Triggered once the WS server is initialized; bind it.
  afterInit(server: Server): void {
    this.adapter.bindServer(server);
  }

  // These are no-ops at the gateway level — the adapter wires per-
  // namespace `connection`/`disconnect` handlers on the underlying
  // namespace's socket events directly.
  handleConnection(_client: Socket): void {}
  handleDisconnect(_client: Socket): void {}
}

// Re-export Nest's decorators just in case (kept here so adapter
// tests can import them from the adapter module without pulling in
// `@nestjs/websockets` directly).
export { ConnectedSocket, MessageBody, SubscribeMessage };
