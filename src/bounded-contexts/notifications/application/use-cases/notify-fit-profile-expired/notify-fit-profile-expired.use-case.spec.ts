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

  // P1 #23
  it('renders the body via NOTIFICATION_DICTIONARY in the recipient locale', async () => {
    repo.setRecipient('u-en', {
      id: 'u-en',
      name: 'Enzo',
      email: 'en@example.com',
      language: 'en',
    });
    repo.setRecipient('u-pt', {
      id: 'u-pt',
      name: 'Enzo',
      email: 'pt@example.com',
      language: 'pt-BR',
    });

    await useCase.execute({ userId: 'u-en' });
    await useCase.execute({ userId: 'u-pt' });

    const enRow = repo.notifications.find((n) => n.userId === 'u-en');
    const ptRow = repo.notifications.find((n) => n.userId === 'u-pt');
    expect(enRow?.message).toContain('quiz');
    expect(ptRow?.message).toContain('questionário');
  });
});
