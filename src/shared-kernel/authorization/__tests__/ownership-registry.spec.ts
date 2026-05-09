import { describe, expect, it } from 'bun:test';
import { OwnershipRegistry } from '../ownership-registry';

describe('OwnershipRegistry (P0-004)', () => {
  it('registers and resolves a lookup by entity name', async () => {
    const r = new OwnershipRegistry();
    r.register('resume', async (id) => `owner-of-${id}`);

    const lookup = r.resolve('resume');
    expect(lookup).toBeDefined();
    expect(await lookup?.('abc')).toBe('owner-of-abc');
  });

  it('returns undefined for an unregistered entity', () => {
    const r = new OwnershipRegistry();
    expect(r.resolve('resume')).toBeUndefined();
  });

  it('throws on duplicate registration', () => {
    const r = new OwnershipRegistry();
    r.register('resume', async () => null);
    expect(() => r.register('resume', async () => null)).toThrow(/duplicate/);
  });

  it('lists registered entities', () => {
    const r = new OwnershipRegistry();
    r.register('resume', async () => null);
    r.register('post', async () => null);
    expect(new Set(r.list())).toEqual(new Set(['resume', 'post']));
  });
});
