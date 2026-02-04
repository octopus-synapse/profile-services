import { DomainEvent } from '@/shared-kernel';

export interface ExportFailedPayload {
  readonly resumeId: string;
  readonly reason: string;
}

export class ExportFailedEvent extends DomainEvent<ExportFailedPayload> {
  static readonly TYPE = 'export.failed';

  constructor(exportId: string, payload: ExportFailedPayload) {
    super(ExportFailedEvent.TYPE, exportId, payload);
  }
}
