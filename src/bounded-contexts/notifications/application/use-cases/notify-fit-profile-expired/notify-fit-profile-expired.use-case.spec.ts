import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryNotificationEmail,
  InMemoryNotificationStream,
  InMemoryNotificationsRepository,
} from '../../../testing';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';
import { NotifyFitProfileExpiredUseCase } from './notify-fit-profile-expired.use-case';

describe('NotifyFitProfileExpiredUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let stream: InMemoryNotificationStream;
  let email: InMemoryNotificationEmail;
  let useCase: NotifyFitProfileExpiredUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    stream = new InMemoryNotificationStream();
    email = new InMemoryNotificationEmail();
    const create = new CreateNotificationUseCase(repo, stream, email, stubLogger);
    useCase = new NotifyFitProfileExpiredUseCase(create, stubLogger);
  });

  it('creates the FIT_PROFILE_EXPIRED notification with the system actor', async () => {
    await useCase.execute({ userId: 'u-1' });

    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0]?.type).toBe('FIT_PROFILE_EXPIRED');
    expect(repo.notifications[0]?.actorId).toBe('system');
  });
});
