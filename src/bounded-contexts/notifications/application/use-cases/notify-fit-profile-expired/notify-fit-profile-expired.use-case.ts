/**
 * Notifications bridge for the fit-profile lockout flow.
 *
 * Called from `FitProfileExpiredEventHandler` when a `UserFitProfile`
 * is marked expired. Creates an in-app notification (which also
 * triggers an instant email per the user's preferences) using the
 * literal `'system'` actor id so the create-notification use case
 * doesn't short-circuit on the self-notification guard.
 *
 * Notification failures are swallowed at the use-case boundary — the
 * lockout itself is the source of truth and must never be blocked by
 * a notification or email failure.
 */

import type { LoggerPort } from '@/shared-kernel';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';

const CTX = 'NotifyFitProfileExpiredUseCase';
const SYSTEM_ACTOR = 'system';

export interface NotifyFitProfileExpiredInput {
  readonly userId: string;
}

export class NotifyFitProfileExpiredUseCase {
  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: NotifyFitProfileExpiredInput): Promise<void> {
    try {
      await this.createNotification.execute({
        userId: input.userId,
        type: 'FIT_PROFILE_EXPIRED',
        actorId: SYSTEM_ACTOR,
        message: 'Seu perfil de fit expirou. Refaça o questionário para voltar a usar o match.',
        entityType: 'UserFitProfile',
        entityId: input.userId,
      });
    } catch (err) {
      this.logger.warn(
        `fit-profile expired notification failed for user=${input.userId}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
