import { DomainEvent } from '@/shared-kernel';

export interface VersionCreatedPayload {
  readonly userId: string;
  readonly versionNumber: number;
  readonly snapshotData: Record<string, unknown>;
}

export class VersionCreatedEvent extends DomainEvent<VersionCreatedPayload> {
  static readonly TYPE = 'resume.version.created';

  constructor(resumeId: string, payload: VersionCreatedPayload) {
    super(VersionCreatedEvent.TYPE, resumeId, payload);
  }
}
