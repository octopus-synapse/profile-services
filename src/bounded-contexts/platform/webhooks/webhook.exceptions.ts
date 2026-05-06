import { EntityNotFoundException } from '@/shared-kernel/exceptions';

export class WebhookNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'WEBHOOK_NOT_FOUND';
  constructor(id?: string) {
    super('Webhook', id);
  }
}
