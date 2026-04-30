import { describe, expect, it } from 'bun:test';
import { CreatePostSchema } from './create-post-request.dto';

describe('CreatePostSchema blind-mode refinement', () => {
  it('accepts a regular non-anonymous post', () => {
    const parsed = CreatePostSchema.safeParse({ type: 'ACHIEVEMENT', content: 'hi' });
    expect(parsed.success).toBe(true);
  });

  it('rejects isAnonymous=true without a category', () => {
    const parsed = CreatePostSchema.safeParse({
      type: 'ACHIEVEMENT',
      content: 'anon',
      isAnonymous: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(['anonymousCategory']);
    }
  });

  it('accepts isAnonymous=true with a valid category', () => {
    const parsed = CreatePostSchema.safeParse({
      type: 'ACHIEVEMENT',
      content: 'anon',
      isAnonymous: true,
      anonymousCategory: 'SALARY',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects anonymousCategory without isAnonymous', () => {
    const parsed = CreatePostSchema.safeParse({
      type: 'ACHIEVEMENT',
      content: 'not anon',
      anonymousCategory: 'SALARY',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown anonymousCategory value', () => {
    const parsed = CreatePostSchema.safeParse({
      type: 'ACHIEVEMENT',
      content: 'anon',
      isAnonymous: true,
      anonymousCategory: 'RANDOM',
    });
    expect(parsed.success).toBe(false);
  });
});
