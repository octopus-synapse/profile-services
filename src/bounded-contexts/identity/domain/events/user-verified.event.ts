import { DomainEvent } from '@/shared-kernel';

export interface UserVerifiedPayload {
  readonly verifiedAt: Date;
}

export class UserVerifiedEvent extends DomainEvent<UserVerifiedPayload> {
  static readonly TYPE = 'identity.user.verified';

  constructor(userId: string, payload: UserVerifiedPayload) {
    super(UserVerifiedEvent.TYPE, userId, payload);
  }
}
