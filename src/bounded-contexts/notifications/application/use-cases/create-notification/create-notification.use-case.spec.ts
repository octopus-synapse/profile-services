import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { UnknownNotificationTypeException } from '../../../domain/exceptions/notifications.exceptions';
import {
  InMemoryNotificationEmail,
  InMemoryNotificationStream,
  InMemoryNotificationsRepository,
} from '../../../testing';
import { CreateNotificationUseCase } from './create-notification.use-case';

describe('CreateNotificationUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let stream: InMemoryNotificationStream;
  let email: InMemoryNotificationEmail;
  let useCase: CreateNotificationUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    stream = new InMemoryNotificationStream();
    email = new InMemoryNotificationEmail();
    useCase = new CreateNotificationUseCase(repo, stream, email, stubLogger);
  });

  it('rejects with UnknownNotificationTypeException for an unregistered type', async () => {
    await expect(
      useCase.execute({
        userId: 'u-1',
        actorId: 'u-2',
        // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard
        type: 'TOTALLY_FAKE_TYPE' as any,
        message: 'oops',
      }),
    ).rejects.toBeInstanceOf(UnknownNotificationTypeException);
  });

  it('returns null when actor and recipient are the same user', async () => {
    const result = await useCase.execute({
      userId: 'u-1',
      actorId: 'u-1',
      type: 'POST_LIKED',
      message: 'self-like',
    });

    expect(result).toBeNull();
    expect(repo.notifications).toHaveLength(0);
  });

  it('skips creation when the user has explicitly disabled the type', async () => {
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: false,
      emailEnabled: true,
      emailDelivery: 'INSTANT',
    });

    const result = await useCase.execute({
      userId: 'u-1',
      actorId: 'u-2',
      type: 'POST_LIKED',
      message: 'someone liked your post',
    });

    expect(result).toBeNull();
    expect(repo.notifications).toHaveLength(0);
  });

  it('creates the row, emits to the SSE bus, and returns the view', async () => {
    repo.setRecipient('u-1', {
      id: 'u-1',
      name: 'Enzo',
      email: 'enzo@example.com',
      language: 'en',
    });

    const result = await useCase.execute({
      userId: 'u-1',
      actorId: 'u-2',
      type: 'POST_LIKED',
      message: 'someone liked your post',
    });

    expect(result).not.toBeNull();
    expect(repo.notifications).toHaveLength(1);
    expect(stream.emissions).toHaveLength(1);
    expect(stream.emissions[0]?.event.message).toBe('someone liked your post');
  });

  it('does not send instant email when emailDelivery is DAILY', async () => {
    repo.setRecipient('u-1', { id: 'u-1', name: null, email: 'a@b.com', language: 'en' });
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: true,
      emailEnabled: true,
      emailDelivery: 'DAILY',
    });

    await useCase.execute({
      userId: 'u-1',
      actorId: 'u-2',
      type: 'POST_LIKED',
      message: 'hi',
    });

    // Wait one microtask so the fire-and-forget email path has a chance.
    await Promise.resolve();
    await Promise.resolve();
    expect(email.sent).toHaveLength(0);
  });
});
