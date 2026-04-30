/**
 * Aggregates per-company first-response latency across *all* users'
 * applications and returns p50 / p90 days plus the response rate.
 *
 * Drives the "essa empresa responde em ~7 dias (p50)" pill on the job
 * detail page. Queries are funneled through the repository which
 * fetches only the first response event per application so the
 * working set stays small even on companies with thousands of apps.
 *
 * The use case is in charge of:
 *   - converting absolute timestamps into integer day deltas
 *   - sorting + indexed-percentile (no fancy interpolation — the UI
 *     just shows the value) and clamping to the highest sample
 *   - returning `{ p50: null, p90: null, responseRate: 0 }` for
 *     companies with no applications at all so the controller can
 *     surface a "no data yet" state distinctly from "0% response".
 */

import type { CompanyResponseStats } from '../../../domain/entities/application-tracker';
import { ApplicationTrackerRepositoryPort } from '../../../domain/ports/application-tracker.repository.port';

// Re-exported so the controller can name the response shape without
// reaching into `domain/entities/` directly (layer-isolation rule).
export type { CompanyResponseStats };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class GetCompanyResponseStatsUseCase {
  constructor(private readonly repository: ApplicationTrackerRepositoryPort) {}

  async execute(company: string): Promise<CompanyResponseStats> {
    const samples = await this.repository.findCompanyResponseSamples(company);
    const sampleSize = samples.length;
    if (sampleSize === 0) {
      return { company, sampleSize: 0, p50Days: null, p90Days: null, responseRate: 0 };
    }

    const responseDays: number[] = [];
    let responded = 0;
    for (const sample of samples) {
      if (!sample.firstResponseAt) continue;
      responded++;
      const days = Math.max(
        0,
        Math.floor((sample.firstResponseAt.getTime() - sample.createdAt.getTime()) / MS_PER_DAY),
      );
      responseDays.push(days);
    }

    responseDays.sort((a, b) => a - b);
    const percentile = (p: number): number | null => {
      if (responseDays.length === 0) return null;
      const index = Math.min(responseDays.length - 1, Math.floor(p * responseDays.length));
      return responseDays[index] ?? null;
    };

    return {
      company,
      sampleSize,
      p50Days: percentile(0.5),
      p90Days: percentile(0.9),
      responseRate: responded / sampleSize,
    };
  }
}
