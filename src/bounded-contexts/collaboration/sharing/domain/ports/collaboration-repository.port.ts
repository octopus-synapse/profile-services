import type { CollaboratorRole } from '@/bounded-contexts/collaboration/domain/enums';
import type { DomainException } from '@/shared-kernel/exceptions';
import type { CollaboratorWithUser, SharedResume } from '../types/collaboration.types';

export abstract class CollaborationRepositoryPort {
  abstract findResumeOwner(resumeId: string): Promise<{ userId: string } | null>;
  abstract findCollaborator(
    resumeId: string,
    userId: string,
  ): Promise<{ id: string; role: string } | null>;
  abstract findCollaborators(resumeId: string): Promise<CollaboratorWithUser[]>;
  abstract createCollaborator(data: {
    resumeId: string;
    userId: string;
    role: CollaboratorRole;
    invitedBy: string;
  }): Promise<CollaboratorWithUser>;

  /**
   * Race-free invite (concurrency-sweep ticket). Counts collaborators inside a
   * tx with `FOR UPDATE` so concurrent inviters serialise on the
   * locked rows. Throws `quota.exception` when the cap is reached,
   * otherwise inserts. Collapses the TOCTOU window between count and
   * insert.
   */
  abstract createCollaboratorWithQuota(
    data: {
      resumeId: string;
      userId: string;
      role: CollaboratorRole;
      invitedBy: string;
    },
    quota: { readonly max: number; readonly exception: DomainException },
  ): Promise<CollaboratorWithUser>;
  abstract updateRole(
    resumeId: string,
    userId: string,
    role: CollaboratorRole,
  ): Promise<CollaboratorWithUser>;
  abstract deleteCollaborator(resumeId: string, userId: string): Promise<void>;
  abstract getSharedResumes(userId: string): Promise<SharedResume[]>;
}
