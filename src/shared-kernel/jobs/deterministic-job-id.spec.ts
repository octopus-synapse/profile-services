import { describe, expect, it } from 'bun:test';
import { deterministicJobId } from './deterministic-job-id';

describe('deterministicJobId (P1 #42)', () => {
  it('returns the same id for the same queue + payload', () => {
    const a = deterministicJobId('cache-invalidation', { key: 'user:1' });
    const b = deterministicJobId('cache-invalidation', { key: 'user:1' });
    expect(a).toBe(b);
  });

  it('is independent of property declaration order', () => {
    const a = deterministicJobId('q', { x: 1, y: 2 });
    const b = deterministicJobId('q', { y: 2, x: 1 });
    expect(a).toBe(b);
  });

  it('differs across queue names', () => {
    const a = deterministicJobId('queue-a', { id: '1' });
    const b = deterministicJobId('queue-b', { id: '1' });
    expect(a).not.toBe(b);
  });

  it('differs across payloads', () => {
    const a = deterministicJobId('q', { id: '1' });
    const b = deterministicJobId('q', { id: '2' });
    expect(a).not.toBe(b);
  });
});
