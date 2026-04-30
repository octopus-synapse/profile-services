import { describe, expect, it } from 'bun:test';
import { AnonymousMaskService } from './anonymous-mask.service';

const svc = new AnonymousMaskService();

const baseAuthor = {
  id: 'user-1',
  name: 'Alice',
  username: 'alice',
  photoURL: 'photo.jpg',
  bio: 'Senior Engineer',
  location: 'São Paulo, BR',
};

describe('AnonymousMaskService', () => {
  it('returns post unchanged when not anonymous', () => {
    const post = { isAnonymous: false, author: baseAuthor };
    expect(svc.mask(post)).toBe(post);
  });

  it('masks author fields when anonymous', () => {
    const post = { isAnonymous: true, author: baseAuthor };
    const out = svc.mask(post);
    expect(out.author.id).toBe('__anonymous__');
    expect(out.author.username).toBeNull();
    expect(out.author.photoURL).toBeNull();
  });

  it('builds label from bio + city', () => {
    const post = { isAnonymous: true, author: baseAuthor };
    const out = svc.mask(post);
    expect(out.author.name).toBe('Senior Engineer · São Paulo');
  });

  it('falls back to bio only when no city', () => {
    const post = {
      isAnonymous: true,
      author: { ...baseAuthor, location: null },
    };
    const out = svc.mask(post);
    expect(out.author.name).toBe('Senior Engineer');
  });

  it('falls back to "Anonymous · city" when no bio', () => {
    const post = { isAnonymous: true, author: { ...baseAuthor, bio: null } };
    const out = svc.mask(post);
    expect(out.author.name).toBe('Anonymous · São Paulo');
  });

  it('uses generic Anonymous when no bio or city', () => {
    const post = {
      isAnonymous: true,
      author: { ...baseAuthor, bio: null, location: null },
    };
    expect(svc.mask(post).author.name).toBe('Anonymous');
  });

  it('handles null author', () => {
    const post: { isAnonymous: boolean; author: typeof baseAuthor | null } = {
      isAnonymous: true,
      author: null,
    };
    const out = svc.mask(post);
    expect(out.author?.name).toBe('Anonymous');
  });
});
