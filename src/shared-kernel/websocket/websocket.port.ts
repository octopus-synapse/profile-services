/**
 * Framework-free WebSocket abstraction. Wraps Socket.IO today; future
 * adapter could swap in Bun's native ws or Elysia's ws plugin without
 * touching consumer code.
 *
 * The port models the two surfaces consumers actually need:
 *  - per-namespace inbound subscription (handle 'send-message',
 *    'typing', etc. messages from clients)
 *  - per-namespace outbound emission (push events to a specific user
 *    or broadcast across a room)
 *
 * Auth is the adapter's job: when a client connects, the adapter
 * resolves the user via `WsAuthExtractorPort` (or equivalent) and
 * supplies the resolved `userId` in the connection context. Handlers
 * receive `{ userId, payload }` — never a raw Socket.IO socket.
 */

export interface WsConnection {
  readonly userId: string;
  readonly socketId: string;
}

export interface WsContext<T = unknown> {
  readonly userId: string;
  readonly socketId: string;
  readonly payload: T;
}

export interface WsHandshake {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly cookies: Record<string, string | undefined>;
  readonly auth: Record<string, unknown>;
  readonly query: Record<string, string | string[] | undefined>;
}

export type WsAuthenticator = (handshake: WsHandshake) => Promise<string | null>;

// `void` in the union is intentional: handlers can either return a
// value (sent back via Socket.IO ack) OR return nothing at all. We
// don't want to force every void handler to literally `return undefined`.
export type WsMessageHandler<TPayload = unknown, TReply = unknown> = (
  ctx: WsContext<TPayload>,
  // biome-ignore lint/suspicious/noConfusingVoidType: see comment above
) => Promise<TReply | void> | TReply | void;

export type WsConnectionHandler = (connection: WsConnection) => Promise<void> | void;

export abstract class WebSocketNamespace {
  /** Register a handler for an inbound message type (the
   *  `SubscribeMessage` equivalent). Adapter wires it on every
   *  authenticated socket in this namespace. */
  abstract on<TPayload = unknown, TReply = unknown>(
    event: string,
    handler: WsMessageHandler<TPayload, TReply>,
  ): void;

  /** Register a callback fired when a client connects (after auth
   *  succeeds). */
  abstract onConnect(handler: WsConnectionHandler): void;

  /** Register a callback fired when a client disconnects. */
  abstract onDisconnect(handler: WsConnectionHandler): void;

  /** Push an event to all sockets owned by `userId` in this namespace. */
  abstract toUser(userId: string, event: string, payload: unknown): void;

  /** Push an event to a specific room (membership managed by the adapter). */
  abstract toRoom(room: string, event: string, payload: unknown): void;

  /** Broadcast to a room from a specific socket, excluding the sender. */
  abstract toRoomExcept(socketId: string, room: string, event: string, payload: unknown): void;

  /** Make a socket join a room (used for per-conversation broadcasts). */
  abstract joinRoom(socketId: string, room: string): Promise<void>;

  /** Remove a socket from a room. */
  abstract leaveRoom(socketId: string, room: string): Promise<void>;
}

export abstract class WebSocketPort {
  /** Configures and returns a namespace handle. Authentication is the
   *  adapter's responsibility — pass it as a callback that resolves
   *  the userId from the handshake. Connections without a userId are
   *  rejected. */
  abstract namespace(name: string, authenticate: WsAuthenticator): WebSocketNamespace;
}
