/**
 * Batch fit-score: scores every job in a listing against the viewer's
 * aggregated resume skills. No LLM, no keyword matching — just
 * `computeFitScore` per row — so it's cheap enough to attach to every
 * `/jobs` listing item.
 *
 * Resume english/remote signals aren't captured structurally yet, so
 * we leave them null and let the scorer fall back to neutral factors.
 */

import type { JobFitInputRow } from '../../domain/entities/job.entity';
import { JobsRepositoryPort } from '../../domain/ports/jobs.repository.port';
import { computeFitScore, type FitScore } from './compute-fit-score.service';

export class FitScoreBatchService {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async scoreJobsForUser(userId: string, jobs: JobFitInputRow[]): Promise<Map<string, FitScore>> {
    const resumeSkills = await this.repository.collectUserSkills(userId);

    const out = new Map<string, FitScore>();
    for (const job of jobs) {
      out.set(
        job.id,
        computeFitScore({
          resumeSkills,
          resumeEnglish: null,
          resumeRemotePref: null,
          jobSkills: job.skills ?? [],
          jobMinEnglish: job.minEnglishLevel,
          jobRemotePolicy: job.remotePolicy,
        }),
      );
    }
    return out;
  }
}
