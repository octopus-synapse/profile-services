/**
 * Access Public Resume Use Case
 *
 * Single entrypoint for the two public-resume read paths (`GET /:slug`
 * and `GET /:slug/download`). Encapsulates the share resolution + access
 * gates (active flag, expiration, optional password) and emits the right
 * `ShareViewed` / `ShareDownloaded` event so the controller is left as a
 * one-liner.
 *
 * The share-loader / resume-loader / password verifier are injected as
 * function-shaped dependencies so the use case does not import the
 * infrastructure `ResumeShareService` directly — keeps the application
 * layer framework-free and the tests straightforward.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  ShareExpiredException,
  ShareNotFoundException,
  SharePasswordInvalidException,
  SharePasswordRequiredException,
} from '../../../domain/exceptions/presentation.exceptions';
import { ShareDownloadedEvent, ShareViewedEvent } from '../../../shared-kernel/domain/events';

export type AccessMode = 'view' | 'download';

export interface AccessPublicResumeInput {
  readonly slug: string;
  readonly password: string | undefined;
  readonly mode: AccessMode;
  readonly ip: string;
  readonly userAgent: string | undefined;
  readonly referer: string | undefined;
}

export interface AccessPublicResumeOutput {
  readonly resume: unknown;
  readonly share: { slug: string; expiresAt: Date | null };
}

export interface ShareRecord {
  readonly id: string;
  readonly slug: string;
  readonly resumeId: string;
  readonly isActive: boolean;
  readonly expiresAt: Date | null;
  readonly password: string | null;
}

export interface PublicResumeShareLoader {
  getBySlug(slug: string): Promise<ShareRecord | null>;
  verifyPassword(plain: string, hash: string): Promise<boolean>;
  getResumeWithCache(resumeId: string): Promise<unknown>;
}

export class AccessPublicResumeUseCase {
  constructor(
    private readonly shares: PublicResumeShareLoader,
    private readonly events: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: AccessPublicResumeInput): Promise<AccessPublicResumeOutput> {
    const share = await this.shares.getBySlug(input.slug);
    if (!share?.isActive) throw new ShareNotFoundException();
    if (share.expiresAt && new Date() > share.expiresAt) throw new ShareExpiredException();

    if (share.password) {
      if (!input.password) throw new SharePasswordRequiredException();
      const isValid = await this.shares.verifyPassword(input.password, share.password);
      if (!isValid) throw new SharePasswordInvalidException();
    }

    this.publishAccessEvent(share, input);

    const resume = await this.shares.getResumeWithCache(share.resumeId);
    return {
      resume,
      share: { slug: share.slug, expiresAt: share.expiresAt },
    };
  }

  private publishAccessEvent(share: ShareRecord, input: AccessPublicResumeInput): void {
    const payload = {
      shareId: share.id,
      ip: input.ip,
      userAgent: input.userAgent,
      referer: input.referer,
    };
    if (input.mode === 'view') {
      void this.events.publishAsync(new ShareViewedEvent(share.id, payload));
    } else {
      this.events.publish(new ShareDownloadedEvent(share.id, payload));
    }
  }
}
