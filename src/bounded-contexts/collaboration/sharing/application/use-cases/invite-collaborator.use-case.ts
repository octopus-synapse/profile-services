import { CollaborationStartedEvent } from '@/bounded-contexts/collaboration/domain/events';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  CannotInviteSelfAsCollaboratorException,
  CollaboratorAlreadyInvitedException,
  CollaboratorLimitReachedException,
  OnlyResumeOwnerCanInviteException,
  ResumeNotFoundForCollaborationException,
} from '../../../domain/exceptions/collaboration.exceptions';
import { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type {
  CollaboratorWithUser,
  InviteCollaboratorParams,
} from '../../domain/types/collaboration.types';

/**
 * Hard cap on collaborators per resume. Mirrors the product spec: a single
 * resume can be shared with at most this many distinct collaborators (the
 * owner is not counted). Tweak with care — the SDK quota dialog reads
 * `CollaboratorLimitReachedException.message` to render the limit number.
 */
export const MAX_COLLABORATORS_PER_RESUME = 25;

export class InviteCollaboratorUseCase {
  constructor(
    private readonly repo: CollaborationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(params: InviteCollaboratorParams): Promise<CollaboratorWithUser> {
    const resume = await this.repo.findResumeOwner(params.resumeId);
    if (!resume) throw new ResumeNotFoundForCollaborationException(params.resumeId);
    if (resume.userId !== params.inviterId) throw new OnlyResumeOwnerCanInviteException();
    if (params.inviterId === params.inviteeId) throw new CannotInviteSelfAsCollaboratorException();

    const existing = await this.repo.findCollaborator(params.resumeId, params.inviteeId);
    if (existing) throw new CollaboratorAlreadyInvitedException();

    const collaborator = await this.repo.createCollaboratorWithQuota(
      {
        resumeId: params.resumeId,
        userId: params.inviteeId,
        role: params.role,
        invitedBy: params.inviterId,
      },
      {
        max: MAX_COLLABORATORS_PER_RESUME,
        exception: new CollaboratorLimitReachedException(MAX_COLLABORATORS_PER_RESUME),
      },
    );

    // P2-#7: await so projection / audit handlers can surface failures.
    await this.eventPublisher.publishAsync(
      new CollaborationStartedEvent(collaborator.id, {
        resumeId: params.resumeId,
        ownerId: params.inviterId,
      }),
    );

    return collaborator;
  }
}
