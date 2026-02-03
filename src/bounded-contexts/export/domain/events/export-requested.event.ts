import { DomainEvent } from '@/shared-kernel';

export type ExportFormat = 'pdf' | 'docx' | 'json' | 'latex' | 'banner';

export interface ExportRequestedPayload {
  readonly resumeId: string;
  readonly userId: string;
  readonly format: ExportFormat;
}

export class ExportRequestedEvent extends DomainEvent<ExportRequestedPayload> {
  static readonly TYPE = 'export.requested';

  constructor(exportId: string, payload: ExportRequestedPayload) {
    super(ExportRequestedEvent.TYPE, exportId, payload);
  }
}
