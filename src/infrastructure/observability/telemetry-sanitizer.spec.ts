import { describe, expect, it } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { DomainEvent } from '@/shared-kernel/event-bus';
import { TelemetrySanitizer } from './telemetry-sanitizer';

class TestEvent extends DomainEvent<Record<string, unknown>> {
  constructor(payload: Record<string, unknown>) {
    super('test.event', 'user-123', payload);
  }
}

const config = {
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
    BCRYPT_COST: 12,
    SAFE_FETCH_MAX_BYTES: 5_000_000,
    IP_HASH_SALT: 's'.repeat(32),
  },
  get: () => undefined,
  getOrDefault: (_key: string, fallback: unknown) => fallback,
} as unknown as ConfigPort;

describe('TelemetrySanitizer', () => {
  it('hashes entity identifiers and drops sensitive fields', () => {
    const sanitizer = new TelemetrySanitizer(config);
    const rawUserId = 'user-abc-123';
    const event = new TestEvent({
      userId: rawUserId,
      email: 'person@example.com',
      token: 'secret-token',
      outcome: 'success',
      nested: { resumeId: 'resume-abc-123' },
    });

    const sanitized = sanitizer.sanitizeDomainEvent(event);
    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain(rawUserId);
    expect(serialized).not.toContain('person@example.com');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).toContain('user_id_hash');
    expect(serialized).toContain('resume_id_hash');
  });

  it('keeps only low-cardinality values as tags', () => {
    const sanitizer = new TelemetrySanitizer(config);
    const tags = sanitizer.lowCardinalityTags(
      new TestEvent({ userId: 'user-abc-123', outcome: 'success', provider: 'openai' }),
    );

    expect(tags).toEqual({
      event_type: 'test.event',
      schema_version: '1',
      outcome: 'success',
      provider: 'openai',
    });
  });
});
