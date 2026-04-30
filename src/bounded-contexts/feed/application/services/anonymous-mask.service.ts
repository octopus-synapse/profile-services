/**
 * Blind-mode serializer: when a post is marked anonymous, strip identity
 * fields from the author and replace with a derived label
 * ("Anonymous · SP"). The real `authorId` is still tracked server-side
 * for moderation, rate limits, and ban enforcement — we just never ship
 * it to the wire.
 */

import type { PostAuthor } from '../../domain/entities';

export class AnonymousMaskService {
  /**
   * Apply blind-mode masking to a post-shaped object. Idempotent: passing
   * a non-anonymous post returns the input unchanged.
   */
  mask<T extends { isAnonymous: boolean; author: PostAuthor | null | undefined }>(post: T): T {
    if (!post.isAnonymous) return post;
    const label = this.buildAnonymousLabel(post.author);
    return {
      ...post,
      author: {
        id: '__anonymous__',
        name: label,
        username: null,
        photoURL: null,
        bio: null,
        location: null,
      },
    };
  }

  private buildAnonymousLabel(author: PostAuthor | null | undefined): string {
    if (!author) return 'Anonymous';
    const bioLead = author.bio?.split(/[\n.–—|·]/)[0]?.trim();
    const city = author.location?.split(',')[0]?.trim();
    if (bioLead && city) return `${bioLead} · ${city}`;
    if (bioLead) return bioLead;
    if (city) return `Anonymous · ${city}`;
    return 'Anonymous';
  }
}
