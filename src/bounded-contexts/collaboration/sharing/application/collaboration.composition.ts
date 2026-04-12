import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { CollaborationRepositoryPort } from '../domain/ports/collaboration-repository.port';
import type {
  CollaboratorWithUser,
  InviteCollaboratorParams,
  RemoveCollaboratorParams,
  SharedResume,
  UpdateRoleParams,
} from '../domain/types/collaboration.types';
import { GetCollaboratorsUseCase } from './use-cases/get-collaborators.use-case';
import { GetSharedWithMeUseCase } from './use-cases/get-shared-with-me.use-case';
import { InviteCollaboratorUseCase } from './use-cases/invite-collaborator.use-case';
import { RemoveCollaboratorUseCase } from './use-cases/remove-collaborator.use-case';
import { UpdateRoleUseCase } from './use-cases/update-role.use-case';

export const COLLABORATION_USE_CASES = Symbol('CollaborationUseCases');

export interface CollaborationUseCases {
  inviteCollaborator: {
    execute: (params: InviteCollaboratorParams) => Promise<CollaboratorWithUser>;
  };
  getCollaborators: {
    execute: (resumeId: string, requesterId: string) => Promise<CollaboratorWithUser[]>;
  };
  updateRole: { execute: (params: UpdateRoleParams) => Promise<CollaboratorWithUser> };
  removeCollaborator: { execute: (params: RemoveCollaboratorParams) => Promise<void> };
  getSharedWithMe: { execute: (userId: string) => Promise<SharedResume[]> };
}

export function buildCollaborationUseCases(
  repo: CollaborationRepositoryPort,
  eventPublisher: EventPublisherPort,
): CollaborationUseCases {
  return {
    inviteCollaborator: new InviteCollaboratorUseCase(repo, eventPublisher),
    getCollaborators: new GetCollaboratorsUseCase(repo),
    updateRole: new UpdateRoleUseCase(repo),
    removeCollaborator: new RemoveCollaboratorUseCase(repo),
    getSharedWithMe: new GetSharedWithMeUseCase(repo),
  };
}
