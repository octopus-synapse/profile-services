import { DomainEvent } from '@/shared-kernel';

export interface ExportCompletedPayload {
  readonly resumeId: string;
  readonly fileUrl: string;
}

export class ExportCompletedEvent extends DomainEvent<ExportCompletedPayload> {
  static readonly TYPE = 'export.completed';

  constructor(exportId: string, payload: ExportCompletedPayload) {
    super(ExportCompletedEvent.TYPE, exportId, payload);
  }
}
