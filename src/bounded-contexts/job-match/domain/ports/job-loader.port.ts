export interface JobForMatch {
  readonly id: string;
  /** Stack keywords extracted/listed on the job. */
  readonly keywords: readonly string[];
  /** Recruiter-filled structured requirements. The shape is free-form
   * JSON so this MVP adapts without a schema migration. */
  readonly structuredRequirements: Readonly<Record<string, unknown>>;
  /** AI-extrapolated slots, when the recruiter asked the backend to
   * enrich the raw JD. */
  readonly enrichedByAi?: Readonly<Record<string, unknown>>;
  /** Whether the recruiter captured a culture profile for the employer.
   * Used by the Fit sub-score to skip `culture()` calls when the
   * company-side signal is absent. */
  readonly culturalProfileCaptured: boolean;
  /** When present, identifies the employer for `SimilarityPort.culture()`. */
  readonly companyId: string | null;
}

export abstract class JobLoaderPort {
  abstract load(jobId: string): Promise<JobForMatch | null>;
}
