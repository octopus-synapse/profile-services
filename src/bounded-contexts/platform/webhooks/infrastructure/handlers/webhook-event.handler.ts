/**
 * Listens to the three platform domain events the webhook BC fans
 * out and forwards each to `bc.deliverEventWebhooks`. The
 * ATS-score-update gate (skip if delta < 5 points) lives here as a
 * pure JS condition — the use case stays event-agnostic.
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerPort } from '@/shared-kernel';
import { WebhooksUseCases } from '../../application/ports/webhooks.port';

const ATS_SCORE_DELTA_THRESHOLD = 5;
const CTX = 'WebhookEventHandler';

interface ResumeCreatedPayload {
  resumeId: string;
  userId: string;
  title: string;
}

interface ResumePublishedPayload {
  resumeId: string;
  userId: string;
  publicUrl: string;
}

interface AtsScoreUpdatedPayload {
  resumeId: string;
  userId: string;
  score: number;
  previousScore?: number;
}

@Injectable()
export class WebhookEventHandler {
  constructor(
    private readonly bc: WebhooksUseCases,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent('resume.created', { async: true })
  async handleResumeCreated(payload: ResumeCreatedPayload): Promise<void> {
    this.logger.log(`Resume created event for user ${payload.userId}`, CTX);
    await this.bc.deliverEventWebhooks.execute({
      userId: payload.userId,
      eventType: 'resume.created',
      payload,
    });
  }

  @OnEvent('resume.published', { async: true })
  async handleResumePublished(payload: ResumePublishedPayload): Promise<void> {
    this.logger.log(`Resume published event for user ${payload.userId}`, CTX);
    await this.bc.deliverEventWebhooks.execute({
      userId: payload.userId,
      eventType: 'resume.published',
      payload,
    });
  }

  @OnEvent('ats.score.updated', { async: true })
  async handleATSScoreUpdated(payload: AtsScoreUpdatedPayload): Promise<void> {
    if (
      payload.previousScore !== undefined &&
      Math.abs(payload.score - payload.previousScore) < ATS_SCORE_DELTA_THRESHOLD
    ) {
      // Sub-threshold change — skip to avoid noisy webhook spam.
      return;
    }
    this.logger.log(`ATS score updated for user ${payload.userId}: ${payload.score}`, CTX);
    await this.bc.deliverEventWebhooks.execute({
      userId: payload.userId,
      eventType: 'ats.score.updated',
      payload,
    });
  }
}
