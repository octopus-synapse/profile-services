import type { LoggerPort } from '@/shared-kernel';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import {
  type TranslationProgress,
  TranslationProgressPort,
} from '../../domain/ports/translation-progress.port';

/** Channel the client subscribes to for one user's translation runs. */
export const translationProgressChannel = (userId: string): string => `translation:user:${userId}`;

export class SseTranslationProgressAdapter extends TranslationProgressPort {
  constructor(
    private readonly sse: SseStreamPort,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  publish(userId: string, progress: TranslationProgress): void {
    this.sse.publish(translationProgressChannel(userId), progress);
    this.logger.debug(
      `translation ${progress.status} ${progress.done}/${progress.total} for resume ${progress.resumeId}`,
      'SseTranslationProgressAdapter',
    );
  }
}
