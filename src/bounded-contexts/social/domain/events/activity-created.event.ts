import { DomainEvent } from '@/shared-kernel';

export type ActivityType =
  | 'resume_created'
  | 'resume_published'
  | 'user_followed'
  | 'skill_added';

export interface ActivityCreatedPayload {
  readonly userId: string;
  readonly activityType: ActivityType;
  readonly targetId: string;
}

export class ActivityCreatedEvent extends DomainEvent<ActivityCreatedPayload> {
  static readonly TYPE = 'social.activity.created';

  constructor(activityId: string, payload: ActivityCreatedPayload) {
    super(ActivityCreatedEvent.TYPE, activityId, payload);
  }
}
