import { DomainEvent } from '@/shared-kernel';

export interface UserDeletedPayload {
  readonly reason: string;
}

export class UserDeletedEvent extends DomainEvent<UserDeletedPayload> {
  static readonly TYPE = 'identity.user.deleted';

  constructor(userId: string, payload: UserDeletedPayload) {
    super(UserDeletedEvent.TYPE, userId, payload);
  }
}
