export type CounterLabels = Record<string, string>;

export interface ResumeCreatedLabels {
  templateId?: string;
  [key: string]: string | undefined;
}

export interface UserSignupLabels {
  method?: string;
  [key: string]: string | undefined;
}

export interface ExportLabels {
  format: string;
  [key: string]: string;
}

export interface ApiLatencyLabels {
  method: string;
  route: string;
  status: string;
  [key: string]: string;
}

/** Labels for the scoring subsystem.
 * - `type` discriminates which score family fired (resume_quality | match).
 * - `outcome` reflects degradation: success = all sub-scores filled,
 *   partial = at least one degraded to null, failed = the use case threw.
 *   Cache hits count as `success` regardless of which sub-scores ran when
 *   the value was originally computed — the histogram captures the
 *   read-path cost, not the underlying compute work. */
export interface ScoreComputedLabels {
  type: 'resume_quality' | 'match';
  outcome: 'success' | 'partial' | 'failed';
  [key: string]: string;
}
