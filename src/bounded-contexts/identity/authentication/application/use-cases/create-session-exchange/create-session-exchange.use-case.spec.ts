/**
 * CreateSessionExchangeUseCase tests — V2 D42 mobile flow.
 *
 * Confirms the use case issues a unique opaque id with the `sxc_`
 * prefix, persists the userId+email mapping through the port, and that
 * back-to-back calls produce distinct ids (no collision risk under
 * concurrent login).
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type {
  SessionExchangePayload,
  SessionExchangePort,
} from '../../ports/session-exchange.port';
import { CreateSessionExchangeUseCase } from './create-session-exchange.use-case';

interface StoredEntry {
  payload: SessionExchangePayload;
  ttlSeconds: number;
}

class RecordingSessionExchange implements SessionExchangePort {
  readonly stored = new Map<string, StoredEntry>();

  async store(id: string, payload: SessionExchangePayload, ttlSeconds: number): Promise<void> {
    this.stored.set(id, { payload, ttlSeconds });
  }

  async consume(id: string): Promise<SessionExchangePayload | null> {
    const entry = this.stored.get(id);
    if (!entry) return null;
    this.stored.delete(id);
    return entry.payload;
  }
}

describe('CreateSessionExchangeUseCase', () => {
  let useCase: CreateSessionExchangeUseCase;
  let exchange: RecordingSessionExchange;

  beforeEach(() => {
    exchange = new RecordingSessionExchange();
    useCase = new CreateSessionExchangeUseCase(exchange, stubLogger);
  });

  it('issues a prefixed opaque id and persists the payload with a 60s TTL', async () => {
    const result = await useCase.execute({ userId: 'u-1', email: 'me@example.com' });

    expect(result.sessionExchangeId).toMatch(/^sxc_/);
    const entry = exchange.stored.get(result.sessionExchangeId);
    expect(entry).toBeDefined();
    expect(entry?.payload).toEqual({ userId: 'u-1', email: 'me@example.com' });
    expect(entry?.ttlSeconds).toBe(60);
  });

  it('produces distinct ids across concurrent calls (no collision)', async () => {
    const ids = await Promise.all(
      Array.from({ length: 25 }, () =>
        useCase
          .execute({ userId: 'u-1', email: 'me@example.com' })
          .then((r) => r.sessionExchangeId),
      ),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
