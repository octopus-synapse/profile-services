import type {
  FindShadowCandidatesInput,
  ShadowProfileSnapshot,
} from './shadow-profile-repository.port';

export abstract class FindShadowCandidatesUseCasePort {
  abstract execute(input: FindShadowCandidatesInput): Promise<ShadowProfileSnapshot[]>;
}
