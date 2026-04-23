import { Injectable } from '@nestjs/common';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../domain/ports/quality-score.repository.port';

/** Returns the latest persisted quality snapshot for a resume, or
 * `null` when the quality worker hasn't run yet. Callers that want a
 * guaranteed-fresh result should trigger `ComputeQualityUseCase`
 * synchronously via the POST endpoint. */
@Injectable()
export class GetLatestQualityUseCase {
  constructor(private readonly repository: QualityScoreRepositoryPort) {}

  async execute(resumeId: string): Promise<SavedQualityScore | null> {
    return this.repository.findLatest(resumeId);
  }
}
