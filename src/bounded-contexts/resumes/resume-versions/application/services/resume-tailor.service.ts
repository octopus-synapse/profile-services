/**
 * Resume tailoring facade.
 *
 * Public surface kept stable for cross-BC consumers (`automation/`)
 * while internals are now POJO use cases. Dropping the Prisma + LLM
 * constructor for use-case delegates is the only behavioural change.
 */

import type {
  TailoredVersionDiff,
  TailoredVersionSummary,
  TailorJobInput,
  TailorResumeResult,
} from '../../domain/entities/tailor';
import { GetTailoredVersionDiffUseCase } from '../use-cases/get-tailored-version-diff/get-tailored-version-diff.use-case';
import { GetTailoredVersionsUseCase } from '../use-cases/get-tailored-versions/get-tailored-versions.use-case';
import { TailorResumeForJobUseCase } from '../use-cases/tailor-resume-for-job/tailor-resume-for-job.use-case';

export type { TailoredVersionDiff, TailorResumeResult };

export class ResumeTailorService {
  constructor(
    private readonly tailorForJobUseCase: TailorResumeForJobUseCase,
    private readonly getTailoredVersionsUseCase: GetTailoredVersionsUseCase,
    private readonly getTailoredVersionDiffUseCase: GetTailoredVersionDiffUseCase,
  ) {}

  tailorForJob(input: TailorJobInput): Promise<TailorResumeResult> {
    return this.tailorForJobUseCase.execute(input);
  }

  getTailoredVersions(resumeId: string, userId: string): Promise<TailoredVersionSummary[]> {
    return this.getTailoredVersionsUseCase.execute(resumeId, userId);
  }

  getDiff(resumeId: string, versionId: string, userId: string): Promise<TailoredVersionDiff> {
    return this.getTailoredVersionDiffUseCase.execute(resumeId, versionId, userId);
  }
}
