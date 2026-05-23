import { describe, expect, it } from 'bun:test';
import { makePaginationSchema } from './pagination.factory';

describe('makePaginationSchema', () => {
  const schema = makePaginationSchema(['createdAt', 'updatedAt', 'salaryMin']);

  it('accepts a sortBy value inside the allowlist', () => {
    const parsed = schema.parse({ sortBy: 'updatedAt' });
    expect(parsed.sortBy).toBe('updatedAt');
    expect(parsed.sortOrder).toBe('desc');
  });

  it('rejects a sortBy value outside the allowlist', () => {
    const result = schema.safeParse({ sortBy: 'arbitraryColumn' });
    expect(result.success).toBe(false);
  });

  it('allows sortBy to be omitted (route falls back to its default)', () => {
    const parsed = schema.parse({});
    expect(parsed.sortBy).toBeUndefined();
  });

  it('coerces page + limit and applies defaults', () => {
    const parsed = schema.parse({ page: '3', limit: '15' });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(15);
  });

  it('rejects sortOrder values outside the [asc, desc] union', () => {
    const result = schema.safeParse({ sortOrder: 'sideways' });
    expect(result.success).toBe(false);
  });
});
