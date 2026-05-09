/**
 * `WebSocketPort` impl backed by Bun's native `ServerWebSocket` via
 * Elysia's `.ws(path, handlers)` API. Same namespace-style surface as
 * the Socket.IO adapter so consumer code (BC compositions) doesn't
 * change.
 *
 * Frontend migrates `socket.io-client` → native `WebSocket`. Wire
 * format: every frame is a JSON envelope `{ event, payload, ack? }`.
 * `ack` is an optional id the client supplies; when present and the
 * server-side handler returns a value, the server replies with
 * `{ ack, payload }`.
 *
 * Namespaces are mapped to URL path prefixes (e.g. `'/notifications'`).
 * Authentication is the adapter's responsibility — `authenticate`
 * receives the handshake (headers/cookies/query) and resolves a
 * `userId`. Unauthenticated connections are closed.
 */

import type { ServerWebSocket } from 'bun';
import type Elysia from 'elysia';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  WebSocketNamespace,
  WebSocketPort,
  type WsAuthenticator,
  type WsConnectionHandler,
  type WsHandshake,
  type WsMessageHandler,
} from '@/shared-kernel/websocket/websocket.port';
import { parseCookieHeader } from './cookie-bridge';

interface SocketState {
  readonly userId: string;
  readonly socketId: string;
  readonly rooms: Set<string>;
  /** P1-039 — per-connection rate-limit bucket. */
  readonly rateBucket: RateBucket;
}

interface NamespaceState {
  readonly authenticate: WsAuthenticator;
  readonly messageHandlers: Map<string, WsMessageHandler>;
  readonly connectHandlers: WsConnectionHandler[];
  readonly disconnectHandlers: WsConnectionHandler[];
  readonly userSockets: Map<string, Set<string>>;
  readonly socketsById: Map<string, ServerWebSocket<SocketState>>;
  readonly rooms: Map<string, Set<string>>;
}

interface ClientFrame {
  readonly event: string;
  readonly payload?: unknown;
  readonly ack?: string;
}

/**
 * P1-040 — cap inbound WS frame size at 64KB. Bun's ServerWebSocket
 * doesn't enforce a maxPayloadLength at the protocol level (it
 * inherits Bun's defaults, currently 16MB), so a hostile client could
 * pump 10MB JSON frames that block the parse loop. 64KB is well above
 * the largest legitimate chat payload (8K char content + metadata
 * overhead) and small enough that even thousands of malicious frames
 * stay within sensible memory bounds.
 */
const WS_MAX_PAYLOAD_BYTES = 64 * 1024;

/**
 * P1-039 — per-connection token-bucket rate limiter. A misbehaving
 * client (or a compromised one) used to be able to pump 100+ frames
 * per second indefinitely; the chat handler would re-issue DB hits
 * for each, exhausting connection pool capacity for legitimate
 * traffic. The bucket here lets bursts through (refilling at 30/sec)
 * while capping the steady-state rate at the same number per second
 * per socket. A throttled message is dropped silently — closing the
 * socket would punish legitimate clients caught in a transient burst.
 */
const WS_RATE_REFILL_PER_SEC = 30;
const WS_RATE_BUCKET_CAP = 30;

/**
 * P2-102 — per-user concurrent connection cap. A user opens at most
 * this many sockets per namespace; further upgrades are rejected with
 * HTTP 429. The cap covers the legitimate "browser + mobile + tab
 * background" pattern (~6) plus headroom and prevents a logged-in
 * attacker from saturating the server with idle connections.
 *
 * P2-100 (deferred) — missed-message recovery on reconnect requires
 * a per-namespace event log keyed by an `(userId, sequence)` cursor.
 * Out of scope for this adapter; clients today reconcile via HTTP
 * (e.g. fetching the unread-count endpoint after onopen).
 */
const WS_MAX_CONNECTIONS_PER_USER = 8;
interface RateBucket {
  tokens: number;
  lastRefillMs: number;
}
function consumeToken(bucket: RateBucket): boolean {
  const now = Date.now();
  const elapsedSec = (now - bucket.lastRefillMs) / 1000;
  bucket.tokens = Math.min(WS_RATE_BUCKET_CAP, bucket.tokens + elapsedSec * WS_RATE_REFILL_PER_SEC);
  bucket.lastRefillMs = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

interface ServerFrame {
  readonly event: string;
  readonly payload: unknown;
  readonly ack?: string;
}

let socketCounter = 0;
const nextSocketId = (): string => `s_${Date.now().toString(36)}_${(++socketCounter).toString(36)}`;

export interface ElysiaWebSocketAdapterOptions {
  /**
   * Allowed `Origin` header values for WS upgrade requests. CSRF defense:
   * a browser page on `evil.com` cannot upgrade WS to this server with
   * an Origin matching the user's app, even when the auth cookie is sent
   * automatically.
   *
   * **Fail-closed**: if the set is empty, every upgrade is rejected with
   * `403`. Composition root MUST pass at least the public app origin.
   * Native clients (mobile apps) need an explicit Origin in their
   * upgrade request — this server does not silently allow missing
   * Origin headers in production.
   *
   * Build the set from the union of `CORS_ORIGIN`, `APP_URL` (or
   * `PUBLIC_APP_URL`), and `ALLOWED_WS_ORIGINS` env vars.
   */
  readonly allowedOrigins: ReadonlySet<string>;
  /** Optional logger — used to emit a single warning when fail-closed
   *  rejects an upgrade so misconfigurations are noticed quickly. */
  readonly logger?: LoggerPort;
}

export class ElysiaWebSocketAdapter extends WebSocketPort {
  private readonly namespaces = new Map<string, NamespaceState>();
  private readonly allowedOrigins: ReadonlySet<string>;
  private readonly logger: LoggerPort | undefined;

  constructor(options: ElysiaWebSocketAdapterOptions) {
    super();
    this.allowedOrigins = options.allowedOrigins;
    this.logger = options.logger;
    if (this.allowedOrigins.size === 0) {
      this.logger?.warn(
        'ElysiaWebSocketAdapter constructed with empty allowedOrigins — all WS upgrades will be rejected (fail-closed). Set CORS_ORIGIN / APP_URL / ALLOWED_WS_ORIGINS.',
        'ElysiaWebSocketAdapter',
      );
    }
  }

  private isOriginAllowed(origin: string | null): boolean {
    if (origin === null) return false;
    return this.allowedOrigins.has(origin);
  }

  namespace(name: string, authenticate: WsAuthenticator): WebSocketNamespace {
    const state: NamespaceState = {
      authenticate,
      messageHandlers: new Map(),
      connectHandlers: [],
      disconnectHandlers: [],
      userSockets: new Map(),
      socketsById: new Map(),
      rooms: new Map(),
    };
    this.namespaces.set(name, state);

    const adapter = this;
    return new (class extends WebSocketNamespace {
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
        if (!sockets) return;
        const frame: ServerFrame = { event, payload };
        for (const sid of sockets) {
          const ws = state.socketsById.get(sid);
          ws?.send(JSON.stringify(frame));
        }
      }
      toRoom(room: string, event: string, payload: unknown): void {
        const members = state.rooms.get(room);
        if (!members) return;
        const frame = JSON.stringify({ event, payload });
        for (const sid of members) {
          state.socketsById.get(sid)?.send(frame);
        }
      }
      toRoomExcept(socketId: string, room: string, event: string, payload: unknown): void {
        const members = state.rooms.get(room);
        if (!members) return;
        const frame = JSON.stringify({ event, payload });
        for (const sid of members) {
          if (sid === socketId) continue;
          state.socketsById.get(sid)?.send(frame);
        }
      }
      async joinRoom(socketId: string, room: string): Promise<void> {
        adapter.addToRoom(state, socketId, room);
      }
      async leaveRoom(socketId: string, room: string): Promise<void> {
        adapter.removeFromRoom(state, socketId, room);
      }
    })();
  }

  /** Mount every registered namespace on the Elysia app. Call after
   *  composition has registered all `namespace(...)` calls. */
  mount(app: Elysia): void {
    for (const [path, state] of this.namespaces) {
      this.mountNamespace(app, path, state);
    }
  }

  private mountNamespace(app: Elysia, path: string, state: NamespaceState): void {
    const adapter = this;
    (app as unknown as { ws: (path: string, handlers: object) => unknown }).ws(path, {
      async beforeHandle(ctx: { request: Request; query: Record<string, unknown> }) {
        // P0-002: CSRF defense for WS upgrades. A browser at attacker.com
        // would auto-send the user's httpOnly auth cookie on a WS
        // upgrade — checking Origin is the only browser-side primitive
        // that distinguishes legitimate vs cross-site upgrade requests.
        const origin = ctx.request.headers.get('origin');
        if (!adapter.isOriginAllowed(origin)) {
          adapter.logger?.warn('WS upgrade rejected: disallowed Origin', 'ElysiaWebSocketAdapter', {
            origin: origin ?? '<missing>',
            path,
          });
          return new Response('Forbidden', { status: 403 });
        }
        const handshake: WsHandshake = {
          headers: Object.fromEntries(ctx.request.headers.entries()) as WsHandshake['headers'],
          cookies: parseCookieHeader(ctx.request.headers.get('cookie') ?? undefined),
          auth: {},
          query: ctx.query as WsHandshake['query'],
        };
        const userId = await state.authenticate(handshake);
        if (!userId) return new Response('Unauthorized', { status: 401 });
        // P2-102 — reject upgrade when the user is already at cap on
        // this namespace. Done in beforeHandle so the limit is enforced
        // at the protocol level (no half-open socket to clean up).
        const existing = state.userSockets.get(userId);
        if (existing && existing.size >= WS_MAX_CONNECTIONS_PER_USER) {
          adapter.logger?.warn(
            `WS upgrade rejected: user at connection cap (${existing.size}/${WS_MAX_CONNECTIONS_PER_USER})`,
            'ElysiaWebSocketAdapter',
            { userId, path },
          );
          return new Response('Too Many Connections', { status: 429 });
        }
        // Pass the userId via Elysia's data slot so `open` can read it.
        (ctx as unknown as { data: { userId: string } }).data = { userId };
      },
      open(ws: ServerWebSocket<SocketState> & { data?: { userId: string } }) {
        const userId = ws.data?.userId;
        if (!userId) {
          ws.close();
          return;
        }
        const socketId = nextSocketId();
        // Replace ws.data with the full SocketState the adapter tracks.
        (ws as unknown as { data: SocketState }).data = {
          userId,
          socketId,
          rooms: new Set(),
          rateBucket: { tokens: WS_RATE_BUCKET_CAP, lastRefillMs: Date.now() },
        };
        state.socketsById.set(socketId, ws);
        adapter.trackUserSocket(state, userId, socketId);
        const conn = { userId, socketId };
        for (const h of state.connectHandlers) void h(conn);
      },
      async message(ws: ServerWebSocket<SocketState>, rawMessage: string | Buffer) {
        // P1-040 — drop oversize frames before they hit the JSON
        // parser. Bun keeps the upstream limit at 16MB by default;
        // we tighten it to 64KB at the application layer.
        const byteLength =
          typeof rawMessage === 'string'
            ? Buffer.byteLength(rawMessage, 'utf8')
            : rawMessage.byteLength;
        if (byteLength > WS_MAX_PAYLOAD_BYTES) {
          adapter.logger?.warn(
            `WS frame dropped: ${byteLength} bytes exceeds ${WS_MAX_PAYLOAD_BYTES} cap`,
            'ElysiaWebSocketAdapter',
          );
          ws.close(1009, 'Payload too large'); // 1009 = "Message too big"
          return;
        }
        // P1-039 — silently drop frames that exceed the per-socket
        // rate limit. Throttled messages don't close the connection
        // (transient bursts shouldn't punish legitimate clients).
        if (!consumeToken(ws.data.rateBucket)) {
          return;
        }
        const text = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString('utf8');
        let frame: ClientFrame;
        try {
          frame = JSON.parse(text) as ClientFrame;
        } catch {
          return;
        }
        const handler = state.messageHandlers.get(frame.event);
        if (!handler) return;
        try {
          const reply = await handler({
            userId: ws.data.userId,
            socketId: ws.data.socketId,
            payload: frame.payload,
          });
          if (frame.ack && reply !== undefined) {
            ws.send(JSON.stringify({ ack: frame.ack, payload: reply }));
          }
        } catch (err) {
          if (frame.ack) {
            ws.send(
              JSON.stringify({
                ack: frame.ack,
                payload: { error: err instanceof Error ? err.message : 'Unknown error' },
              }),
            );
          }
        }
      },
      close(ws: ServerWebSocket<SocketState>) {
        const { userId, socketId, rooms } = ws.data;
        for (const room of rooms) adapter.removeFromRoom(state, socketId, room);
        state.socketsById.delete(socketId);
        adapter.untrackUserSocket(state, userId, socketId);
        const conn = { userId, socketId };
        for (const h of state.disconnectHandlers) void h(conn);
      },
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

  private addToRoom(state: NamespaceState, socketId: string, room: string): void {
    const members = state.rooms.get(room) ?? new Set<string>();
    members.add(socketId);
    state.rooms.set(room, members);
    const sock = state.socketsById.get(socketId);
    sock?.data.rooms.add(room);
  }

  private removeFromRoom(state: NamespaceState, socketId: string, room: string): void {
    const members = state.rooms.get(room);
    if (!members) return;
    members.delete(socketId);
    if (members.size === 0) state.rooms.delete(room);
    const sock = state.socketsById.get(socketId);
    sock?.data.rooms.delete(room);
  }
}
