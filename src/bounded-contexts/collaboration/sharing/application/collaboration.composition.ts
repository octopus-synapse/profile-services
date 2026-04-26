import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { CollaborationRepositoryPort } from '../domain/ports/collaboration-repository.port';
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

export abstract class CollaborationUseCases {
  abstract readonly inviteCollaborator: {
    execute: (params: InviteCollaboratorParams) => Promise<CollaboratorWithUser>;
  };
  abstract readonly getCollaborators: {
    execute: (resumeId: string, requesterId: string) => Promise<CollaboratorWithUser[]>;
  };
  abstract readonly updateRole: {
    execute: (params: UpdateRoleParams) => Promise<CollaboratorWithUser>;
  };
  abstract readonly removeCollaborator: {
    execute: (params: RemoveCollaboratorParams) => Promise<void>;
  };
  abstract readonly getSharedWithMe: { execute: (userId: string) => Promise<SharedResume[]> };
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
