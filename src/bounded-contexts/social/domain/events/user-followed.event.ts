import { DomainEvent } from '@/shared-kernel';

export interface UserFollowedPayload {
  readonly followerId: string;
}

export class UserFollowedEvent extends DomainEvent<UserFollowedPayload> {
  static readonly TYPE = 'social.user.followed';

  constructor(userId: string, payload: UserFollowedPayload) {
    super(UserFollowedEvent.TYPE, userId, payload);
  }
}
