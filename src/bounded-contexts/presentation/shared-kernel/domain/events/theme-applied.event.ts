import { DomainEvent } from '@/shared-kernel';

export interface ThemeAppliedPayload {
  readonly resumeId: string;
  readonly userId: string;
}

export class ThemeAppliedEvent extends DomainEvent<ThemeAppliedPayload> {
  static readonly TYPE = 'presentation.theme.applied';

  constructor(themeId: string, payload: ThemeAppliedPayload) {
    super(ThemeAppliedEvent.TYPE, themeId, payload);
  }
}
