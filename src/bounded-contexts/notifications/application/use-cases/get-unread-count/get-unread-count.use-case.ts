import { NotificationsRepositoryPort } from '../../../domain/ports/notifications.repository.port';

export class GetUnreadCountUseCase {
  constructor(private readonly repository: NotificationsRepositoryPort) {}

  execute(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }
}
