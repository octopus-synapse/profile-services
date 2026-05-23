import type { FitProfileStatusView } from '../../application/use-cases/get-fit-profile-status.use-case';
import type { SavedUserFitProfile } from '../../domain/ports/user-fit-profile.repository.port';
import type { FitProfileMeDto } from '../../dto/fit-profile-me-response.schema';
import type { SubmittedFitProfileDto } from '../../dto/submit-fit-answers.schema';

export function toFitProfileMeResponseDto(view: FitProfileStatusView): FitProfileMeDto {
  return {
    status: view.status,
    vector: view.profile?.vector ?? null,
    answeredAt: view.answeredAt ? view.answeredAt.toISOString() : null,
    expiresAt: view.expiresAt ? view.expiresAt.toISOString() : null,
    remainingQuestions: view.remainingQuestions,
  };
}

export function toSubmittedFitProfileResponseDto(
  profile: SavedUserFitProfile,
): SubmittedFitProfileDto {
  return {
    profileId: profile.id,
    version: profile.version,
    computedAt: profile.computedAt.toISOString(),
    expiresAt: profile.expiresAt.toISOString(),
  };
}
