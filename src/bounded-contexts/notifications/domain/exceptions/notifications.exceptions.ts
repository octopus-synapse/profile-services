/**
 * Notifications Bounded Context Exceptions
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class UnknownNotificationTypeException extends ValidationException {
  override readonly code: string = 'UNKNOWN_NOTIFICATION_TYPE';
  constructor(type: string) {
    super(`Notification type "${type}" is not registered`);
  }
}

export class NotificationDeliveryFailedException extends DomainException {
  readonly code: string = 'NOTIFICATION_DELIVERY_FAILED';
  readonly statusHint = 502;
  constructor(channel: string) {
    super(`Notification delivery via ${channel} failed`);
  }
}

export class NotificationNotOwnedException extends DomainException {
  readonly code: string = 'NOTIFICATION_NOT_OWNED';
  readonly statusHint = 403;
  constructor() {
    super('You can only act on your own notifications');
  }
}
