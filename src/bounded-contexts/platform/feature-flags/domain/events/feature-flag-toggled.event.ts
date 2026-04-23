import { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import type { FeatureFlagKey } from '../types';

export interface FeatureFlagToggledPayload {
  key: FeatureFlagKey;
  before: { enabled: boolean; enabledForRoles: string[] };
  after: { enabled: boolean; enabledForRoles: string[] };
  actorId: string;
}

export class FeatureFlagToggledEvent extends DomainEvent<FeatureFlagToggledPayload> {
  static readonly EVENT_TYPE = 'platform.feature_flag.toggled';

  constructor(payload: FeatureFlagToggledPayload) {
    super(FeatureFlagToggledEvent.EVENT_TYPE, payload.key, payload);
  }
}
