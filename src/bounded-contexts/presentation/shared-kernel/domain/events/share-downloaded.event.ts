import { DomainEvent } from '@/shared-kernel';

export interface ShareDownloadedPayload {
  readonly shareId: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly referer?: string;
}

export class ShareDownloadedEvent extends DomainEvent<ShareDownloadedPayload> {
  static readonly TYPE = 'presentation.share.downloaded';
  constructor(shareId: string, payload: ShareDownloadedPayload) {
    super(ShareDownloadedEvent.TYPE, shareId, payload);
  }
}
