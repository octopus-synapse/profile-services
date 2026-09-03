/** Where the per-section progress of a translation run goes (the client's live channel). */

export interface TranslationProgress {
  readonly resumeId: string;
  readonly locale: string;
  readonly done: number;
  readonly total: number;
  readonly status: 'running' | 'completed' | 'failed' | 'skipped';
  readonly reason?: 'flag-off' | 'monthly-cap' | 'provider-unavailable' | 'error';
}

export abstract class TranslationProgressPort {
  abstract publish(userId: string, progress: TranslationProgress): void;
}
