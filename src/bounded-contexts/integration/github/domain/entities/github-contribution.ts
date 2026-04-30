/**
 * Per-repo open-source contribution row that ends up under the
 * `OPEN_SOURCE` section of the user's resume. `role` is derived
 * from ownership + activity counts in the contribution service.
 */
export interface GitHubContribution {
  readonly resumeId: string;
  readonly projectName: string;
  readonly projectUrl: string;
  readonly role: 'maintainer' | 'core_contributor' | 'contributor';
  readonly description?: string;
  readonly technologies: string[];
  readonly commits?: number;
  readonly prsCreated?: number;
  readonly stars?: number;
  readonly startDate: Date;
  readonly isCurrent: boolean;
}
