/**
 * Bundle token for the resume-versions BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives
 * in `resume-versions.composition.ts` — Nest-free.
 */

import type { CreateSnapshotUseCase } from '../use-cases/create-snapshot/create-snapshot.use-case';
import type { GetTailoredVersionDiffUseCase } from '../use-cases/get-tailored-version-diff/get-tailored-version-diff.use-case';
import type { GetTailoredVersionsUseCase } from '../use-cases/get-tailored-versions/get-tailored-versions.use-case';
import type { GetVersionsUseCase } from '../use-cases/get-versions/get-versions.use-case';
import type { RestoreVersionUseCase } from '../use-cases/restore-version/restore-version.use-case';
import type { TailorResumeForJobUseCase } from '../use-cases/tailor-resume-for-job/tailor-resume-for-job.use-case';

export abstract class ResumeVersionsUseCases {
  abstract readonly createSnapshot: CreateSnapshotUseCase;
  abstract readonly getVersions: GetVersionsUseCase;
  abstract readonly restoreVersion: RestoreVersionUseCase;
  abstract readonly tailorResumeForJob: TailorResumeForJobUseCase;
  abstract readonly getTailoredVersions: GetTailoredVersionsUseCase;
  abstract readonly getTailoredVersionDiff: GetTailoredVersionDiffUseCase;
}
