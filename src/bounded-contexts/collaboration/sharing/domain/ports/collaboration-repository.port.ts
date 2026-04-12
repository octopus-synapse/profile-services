import type { CollaboratorRole } from '@/bounded-contexts/collaboration/domain/enums';
import type { CollaboratorWithUser, SharedResume } from '../types/collaboration.types';

export const COLLABORATION_REPOSITORY = Symbol('CollaborationRepository');

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
  abstract updateRole(
    resumeId: string,
    userId: string,
    role: CollaboratorRole,
  ): Promise<CollaboratorWithUser>;
  abstract deleteCollaborator(resumeId: string, userId: string): Promise<void>;
  abstract getSharedResumes(userId: string): Promise<SharedResume[]>;
}
