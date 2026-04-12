import { DomainEvent } from '@/shared-kernel';

export interface ShareViewedPayload {
  readonly shareId: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly referer?: string;
}

export class ShareViewedEvent extends DomainEvent<ShareViewedPayload> {
  static readonly TYPE = 'presentation.share.viewed';
  constructor(shareId: string, payload: ShareViewedPayload) {
    super(ShareViewedEvent.TYPE, shareId, payload);
  }
}
