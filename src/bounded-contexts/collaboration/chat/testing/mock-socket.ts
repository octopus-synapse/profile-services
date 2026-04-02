/**
 * Mock Socket Utilities for Testing
 *
 * Provides properly typed mock implementations for Socket.IO testing.
 */

import { mock } from 'bun:test';
import type { BroadcastOperator, DefaultEventsMap, Server } from 'socket.io';
import type { DecorateAcknowledgementsWithMultipleResponses } from 'socket.io/dist/typed-events';
import type { AuthenticatedSocket } from '../gateways/ws-auth.guard';

type MockBroadcastOperator = BroadcastOperator<
  DecorateAcknowledgementsWithMultipleResponses<DefaultEventsMap>,
  unknown
>;

/**
 * Interface for mock broadcast operator - only the methods we need for testing.
 */
interface TestBroadcastOperator {
  emit: ReturnType<typeof mock>;
  to: ReturnType<typeof mock>;
  in: ReturnType<typeof mock>;
}

/**
 * Interface for mock server - only the methods we need for testing.
 */
interface TestServer {
  to: ReturnType<typeof mock>;
  in: ReturnType<typeof mock>;
  emit: ReturnType<typeof mock>;
}

/**
 * Creates a mock BroadcastOperator with all required methods.
 * Use this when mocking socket.to() or server.to() returns.
 */
export function createMockBroadcastOperator(): TestBroadcastOperator & MockBroadcastOperator {
  const emitMock = mock(() => true);
  const toMock = mock();
  const inMock = mock();

  const operator: TestBroadcastOperator = {
    emit: emitMock,
    to: toMock,
    in: inMock,
  };

  // Self-reference for chaining
  toMock.mockReturnValue(operator);
  inMock.mockReturnValue(operator);

  // Cast to MockBroadcastOperator for compatibility with gateway.server type
  return operator as TestBroadcastOperator & MockBroadcastOperator;
}

/**
 * Creates a mock AuthenticatedSocket for testing.
 */
export function createMockSocket(
  overrides: Partial<AuthenticatedSocket> = {},
): AuthenticatedSocket {
  const broadcastOperator = createMockBroadcastOperator();

  const socket: AuthenticatedSocket = {
    id: 'socket-1',
    userId: 'user-1',
    handshake: {
      headers: { cookie: '' },
      auth: { token: 'valid-token' },
      query: {},
      time: new Date().toISOString(),
      address: '127.0.0.1',
      xdomain: false,
      secure: false,
      issued: Date.now(),
      url: '/socket.io',
    },
    join: mock(() => Promise.resolve()),
    leave: mock(() => Promise.resolve()),
    to: mock(() => broadcastOperator),
    emit: mock(() => true),
    disconnect: mock(() => socket),
    ...overrides,
  } as AuthenticatedSocket;

  return socket;
}

/**
 * Creates a mock Server for testing.
 */
export function createMockServer(): TestServer & Server {
  const broadcastOperator = createMockBroadcastOperator();

  const server: TestServer = {
    to: mock(() => broadcastOperator),
    in: mock(() => broadcastOperator),
    emit: mock(() => true),
  };

  return server as TestServer & Server;
}

/**
 * Gets the emit mock from a BroadcastOperator for assertions.
 */
export function getEmitMock(
  operator: TestBroadcastOperator | MockBroadcastOperator,
): ReturnType<typeof mock> {
  return operator.emit as ReturnType<typeof mock>;
}
