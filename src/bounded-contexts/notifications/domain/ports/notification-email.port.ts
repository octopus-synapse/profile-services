/**
 * Outbound port for sending notification-related emails. The HTTP
 * adapter wraps the platform `EmailService`; tests use an in-memory
 * implementation that records every send.
 */

export interface NotificationEmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export abstract class NotificationEmailPort {
  abstract send(message: NotificationEmailMessage): Promise<void>;
}
