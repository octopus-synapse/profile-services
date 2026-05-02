import { beforeEach, describe, expect, it } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  PublicResumeNotFoundException,
  ShareLinkExpiredException,
  SharePasswordInvalidException,
  SharePasswordRequiredException,
} from '../../../domain/exceptions/presentation.exceptions';
import {
  AccessPublicResumeUseCase,
  type PublicResumeShareLoader,
  type ShareRecord,
} from './access-public-resume.use-case';

class RecordingEventPublisher extends EventPublisherPort {
  readonly published: DomainEvent<unknown>[] = [];
  publish<T>(event: DomainEvent<T>): void {
    this.published.push(event);
  }
  async publishAsync<T>(event: DomainEvent<T>): Promise<void> {
    this.published.push(event);
  }
  on(): void {
    /* no-op for tests */
  }
}

class StubShareLoader implements PublicResumeShareLoader {
  share: ShareRecord | null = null;
  resume: unknown = { id: 'r-1' };
  validPassword = true;
  async getBySlug(_slug: string) {
    return this.share;
  }
  async verifyPassword(_plain: string, _hash: string) {
    return this.validPassword;
  }
  async getResumeWithCache(_resumeId: string) {
    return this.resume;
  }
}

const baseShare: ShareRecord = {
  id: 's-1',
  slug: 'john',
  resumeId: 'r-1',
  isActive: true,
  expiresAt: null,
  password: null,
};

const baseInput = {
  slug: 'john',
  password: undefined,
  mode: 'view' as const,
  ip: '1.2.3.4',
  userAgent: 'curl',
  referer: undefined,
};

describe('AccessPublicResumeUseCase', () => {
  let loader: StubShareLoader;
  let events: RecordingEventPublisher;
  let useCase: AccessPublicResumeUseCase;

  beforeEach(() => {
    loader = new StubShareLoader();
    events = new RecordingEventPublisher();
    useCase = new AccessPublicResumeUseCase(loader, events, stubLogger);
  });

  it('returns the resume and emits ShareViewedEvent on view mode', async () => {
    loader.share = baseShare;
    const result = await useCase.execute(baseInput);

    expect(result.resume).toEqual(loader.resume);
    expect(result.share.slug).toBe('john');
    expect(events.published).toHaveLength(1);
  });

  it('emits ShareDownloadedEvent on download mode', async () => {
    loader.share = baseShare;
    await useCase.execute({ ...baseInput, mode: 'download' });
    expect(events.published).toHaveLength(1);
  });

  it('throws PublicResumeNotFoundException when missing or inactive', async () => {
    loader.share = null;
    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(PublicResumeNotFoundException);

    loader.share = { ...baseShare, isActive: false };
    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(PublicResumeNotFoundException);
  });

  it('throws ShareLinkExpiredException with slug when past expiresAt', async () => {
    loader.share = { ...baseShare, expiresAt: new Date('2020-01-01') };
    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(ShareLinkExpiredException);
  });

  it('rejects when password is required but missing', async () => {
    loader.share = { ...baseShare, password: 'hash' };
    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(SharePasswordRequiredException);
  });

  it('rejects when supplied password does not match', async () => {
    loader.share = { ...baseShare, password: 'hash' };
    loader.validPassword = false;
    await expect(useCase.execute({ ...baseInput, password: 'nope' })).rejects.toBeInstanceOf(
      SharePasswordInvalidException,
    );
  });
});
