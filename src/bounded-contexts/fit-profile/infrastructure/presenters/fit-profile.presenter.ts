import type { FitProfileStatusView } from '../../application/use-cases/get-fit-profile-status.use-case';
import type { SavedUserFitProfile } from '../../domain/ports/user-fit-profile.repository.port';
import type { FitProfileMeResponseDto } from '../../dto/fit-profile-me-response.dto';
import type { SubmittedFitProfileResponseDto } from '../../dto/submit-fit-answers.dto';

export function presentFitProfileMe(view: FitProfileStatusView): FitProfileMeResponseDto {
  return {
    status: view.status,
    vector: view.profile?.vector ?? null,
    answeredAt: view.answeredAt ? view.answeredAt.toISOString() : null,
    expiresAt: view.expiresAt ? view.expiresAt.toISOString() : null,
    remainingQuestions: view.remainingQuestions,
  };
}

export function presentSubmittedFitProfile(
  profile: SavedUserFitProfile,
): SubmittedFitProfileResponseDto {
  return {
    profileId: profile.id,
    version: profile.version,
    computedAt: profile.computedAt.toISOString(),
    expiresAt: profile.expiresAt.toISOString(),
  };
}
