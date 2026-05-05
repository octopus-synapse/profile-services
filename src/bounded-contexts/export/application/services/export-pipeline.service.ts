/**
 * Export Pipeline Service
 *
 * Wraps any export task (PDF / DOCX / banner / bundle) in the lifecycle
 * the rest of the system listens to: a `Requested` event before the task
 * runs, `Completed` on success, `Failed` on error — plus a `domain
 * ExportPipelineFailedException` so the global filter emits a translated
 * 500 instead of a raw stack trace.
 *
 * Controllers should call this instead of invoking the use case directly:
 *
 *   return this.pipeline.run('pdf', userId, () => useCase.execute(...));
 *
 * Keeps the audit/notification lifecycle in one place — and out of every
 * handler — without leaking `EventPublisher` into each individual use case.
 */

import { randomUUID } from 'node:crypto';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import { ExportCompletedEvent, ExportFailedEvent, ExportRequestedEvent } from '../../domain/events';
import {
  ExportBannerGenerationFailedException,
  ExportEngineFailedException,
} from '../../domain/exceptions/export.exceptions';

export type ExportFormat = 'pdf' | 'docx' | 'json' | 'bundle' | 'banner' | 'latex';

export class ExportPipelineService {
  constructor(private readonly events: EventPublisher) {}

  /**
   * Runs `task`, emitting Requested / Completed / Failed around it.
   * Throws `ExportPipelineFailedException(format)` on failure so the
   * global `DomainExceptionFilter` can translate the 500.
   *
   * If the underlying error already carries a domain `code` (e.g. a
   * `ExportPdfGenerationFailedException` raised inside the use case)
   * we re-throw it untouched so the upstream code/i18n message is
   * preserved. For a raw / framework error we wrap it in a generic
   * `ExportEngineFailedException` so callers always see a typed
   * domain exception with a useful HTTP status hint.
   */
  async run<T>(format: ExportFormat, userId: string, task: () => Promise<T>): Promise<T> {
    const exportId = randomUUID();
    this.events.publish(new ExportRequestedEvent(exportId, { resumeId: userId, userId, format }));
    try {
      const result = await task();
      this.events.publish(
        new ExportCompletedEvent(exportId, { userId, resumeId: userId, fileUrl: '' }),
      );
      return result;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.events.publish(new ExportFailedEvent(exportId, { userId, resumeId: userId, reason }));
      if (err instanceof Error && err.constructor.name.endsWith('Exception')) {
        throw err;
      }
      // Engine-level failure (network / fs / external binary) — surface as
      // a typed 502 instead of a generic 500.
      throw new ExportEngineFailedException(format, reason);
    }
  }

  /**
   * Banner export does not have an associated user/resume id (the
   * catalog page renders one per palette anonymously), so we skip the
   * event lifecycle and only translate failures into the domain
   * exception.
   */
  async runBanner(task: () => Promise<Buffer>): Promise<Buffer> {
    try {
      return await task();
    } catch (err) {
      if (err instanceof Error && err.constructor.name.endsWith('Exception')) {
        throw err;
      }
      throw new ExportBannerGenerationFailedException(
        err instanceof Error ? err.message : 'unknown',
      );
    }
  }
}
