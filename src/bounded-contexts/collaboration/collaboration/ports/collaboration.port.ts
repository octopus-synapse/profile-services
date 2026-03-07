/**
 * Collaboration Service Port
 *
 * Interface for collaboration operations following clean architecture.
 */

import type {
  CollaboratorWithUser,
  InviteCollaboratorParams,
  RemoveCollaboratorParams,
  UpdateRoleParams,
} from '../collaboration.service';

export const COLLABORATION_SERVICE_PORT = Symbol('COLLABORATION_SERVICE_PORT');

export interface CollaborationServicePort {
  inviteCollaborator(params: InviteCollaboratorParams): Promise<CollaboratorWithUser>;
  getCollaborators(resumeId: string, userId: string): Promise<CollaboratorWithUser[]>;
  updateCollaboratorRole(params: UpdateRoleParams): Promise<CollaboratorWithUser>;
  removeCollaborator(params: RemoveCollaboratorParams): Promise<void>;
  getSharedWithMe(userId: string): Promise<
    Array<{
      role: string;
      invitedAt: Date;
      resume: {
        id: string;
        title: string | null;
      };
    }>
  >;
}
