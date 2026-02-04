import { DomainEvent } from '@/shared-kernel';

export interface AtsScoreCalculatedPayload {
  readonly score: number;
  readonly issues: readonly string[];
}

export class AtsScoreCalculatedEvent extends DomainEvent<AtsScoreCalculatedPayload> {
  static readonly TYPE = 'analytics.ats.score.calculated';

  constructor(resumeId: string, payload: AtsScoreCalculatedPayload) {
    super(AtsScoreCalculatedEvent.TYPE, resumeId, payload);
  }
}
