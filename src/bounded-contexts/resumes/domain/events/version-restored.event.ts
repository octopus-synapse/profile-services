import { DomainEvent } from '@/shared-kernel';

export interface VersionRestoredPayload {
  readonly userId: string;
  readonly restoredFromVersion: number;
}

export class VersionRestoredEvent extends DomainEvent<VersionRestoredPayload> {
  static readonly TYPE = 'resume.version.restored';

  constructor(resumeId: string, payload: VersionRestoredPayload) {
    super(VersionRestoredEvent.TYPE, resumeId, payload);
  }
}
