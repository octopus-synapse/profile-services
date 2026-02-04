import { DomainEvent } from '@/shared-kernel';

export interface UserRegisteredPayload {
  readonly email: string;
  readonly username: string;
}

export class UserRegisteredEvent extends DomainEvent<UserRegisteredPayload> {
  static readonly TYPE = 'identity.user.registered';

  constructor(userId: string, payload: UserRegisteredPayload) {
    super(UserRegisteredEvent.TYPE, userId, payload);
  }
}
