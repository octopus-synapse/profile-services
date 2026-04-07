import { DomainEvent } from '@/shared-kernel';

export type SocialActivityType =
  | 'resume_created'
  | 'resume_published'
  | 'user_followed'
  | 'section_item_added';

export interface ActivityCreatedPayload {
  readonly userId: string;
  readonly activityType: SocialActivityType;
  readonly targetId: string;
}

export class ActivityCreatedEvent extends DomainEvent<ActivityCreatedPayload> {
  static readonly TYPE = 'social.activity.created';

  constructor(activityId: string, payload: ActivityCreatedPayload) {
    super(ActivityCreatedEvent.TYPE, activityId, payload);
  }
}
