import type { SavedJobFitProfile } from '../../domain/ports/job-fit-profile.repository.port';
import type { JobFitProfileResponseDto } from '../../dto/job-fit-profile.schema';

export function presentJobFitProfile(profile: SavedJobFitProfile): JobFitProfileResponseDto {
  return {
    id: profile.id,
    jobId: profile.jobId,
    editedByUserId: profile.editedByUserId,
    computedAt: profile.computedAt.toISOString(),
    vector: {
      bigFive: profile.vector.bigFive,
      schwartz: profile.vector.schwartz,
      sdt: profile.vector.sdt,
    },
  };
}
