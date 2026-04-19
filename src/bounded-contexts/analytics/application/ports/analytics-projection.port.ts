/**
 * Analytics Projection Port
 *
 * Abstraction for maintaining the analytics read model (AnalyticsResumeProjection).
 * Consumed by the SyncProjectionOn* event handlers.
 */

export const ANALYTICS_PROJECTION_PORT = Symbol('ANALYTICS_PROJECTION_PORT');

export abstract class AnalyticsProjectionPort {
  abstract upsertProjection(
    resumeId: string,
    data: { userId: string; title: string },
  ): Promise<void>;

  abstract deleteProjection(resumeId: string): Promise<void>;

  abstract touchProjection(resumeId: string): Promise<void>;

  abstract incrementSectionCount(resumeId: string, semanticKind: string): Promise<void>;

  abstract decrementSectionCount(resumeId: string, semanticKind: string): Promise<void>;
}
