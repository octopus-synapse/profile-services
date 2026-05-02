import { beforeEach, describe, expect, it } from 'bun:test';
import {
  CannotInviteSelfAsCollaboratorException,
  CollaboratorAlreadyInvitedException,
  CollaboratorLimitReachedException,
  OnlyResumeOwnerCanInviteException,
  ResumeNotFoundForCollaborationException,
} from '@/bounded-contexts/collaboration/domain/exceptions/collaboration.exceptions';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryCollaborationRepository } from '../../testing/in-memory-collaboration.service';
import {
  InviteCollaboratorUseCase,
  MAX_COLLABORATORS_PER_RESUME,
} from './invite-collaborator.use-case';

describe('InviteCollaboratorUseCase', () => {
  let repo: InMemoryCollaborationRepository;
  let publisher: EventPublisher;
  let useCase: InviteCollaboratorUseCase;

  beforeEach(() => {
    repo = new InMemoryCollaborationRepository();
    publisher = new EventPublisher();
    useCase = new InviteCollaboratorUseCase(repo, publisher, stubLogger);
  });

  it('invites a collaborator', async () => {
    repo.seedResume({ id: 'resume-1', userId: 'owner-1' });
    const result = await useCase.execute({
      resumeId: 'resume-1',
      inviterId: 'owner-1',
      inviteeId: 'invitee-1',
      role: 'VIEWER',
    });
    expect(result.userId).toBe('invitee-1');
  });

  it('throws ResumeNotFoundForCollaborationException for unknown resume', async () => {
    await expect(
      useCase.execute({
        resumeId: 'missing',
        inviterId: 'owner-1',
        inviteeId: 'invitee-1',
        role: 'VIEWER',
      }),
    ).rejects.toThrow(ResumeNotFoundForCollaborationException);
  });

  it('throws OnlyResumeOwnerCanInviteException when inviter is not the owner', async () => {
    repo.seedResume({ id: 'resume-1', userId: 'owner-1' });
    await expect(
      useCase.execute({
        resumeId: 'resume-1',
        inviterId: 'someone-else',
        inviteeId: 'invitee-1',
        role: 'VIEWER',
      }),
    ).rejects.toThrow(OnlyResumeOwnerCanInviteException);
  });

  it('throws CannotInviteSelfAsCollaboratorException when inviter == invitee', async () => {
    repo.seedResume({ id: 'resume-1', userId: 'owner-1' });
    await expect(
      useCase.execute({
        resumeId: 'resume-1',
        inviterId: 'owner-1',
        inviteeId: 'owner-1',
        role: 'VIEWER',
      }),
    ).rejects.toThrow(CannotInviteSelfAsCollaboratorException);
  });

  it('throws CollaboratorAlreadyInvitedException when invitee is already a collaborator', async () => {
    repo.seedResume({ id: 'resume-1', userId: 'owner-1' });
    repo.seedCollaborator({ resumeId: 'resume-1', userId: 'invitee-1' });
    await expect(
      useCase.execute({
        resumeId: 'resume-1',
        inviterId: 'owner-1',
        inviteeId: 'invitee-1',
        role: 'VIEWER',
      }),
    ).rejects.toThrow(CollaboratorAlreadyInvitedException);
  });

  it('throws CollaboratorLimitReachedException when the resume has hit the cap', async () => {
    repo.seedResume({ id: 'resume-1', userId: 'owner-1' });
    for (let i = 0; i < MAX_COLLABORATORS_PER_RESUME; i++) {
      repo.seedCollaborator({ resumeId: 'resume-1', userId: `existing-${i}` });
    }
    await expect(
      useCase.execute({
        resumeId: 'resume-1',
        inviterId: 'owner-1',
        inviteeId: 'invitee-new',
        role: 'VIEWER',
      }),
    ).rejects.toThrow(CollaboratorLimitReachedException);
  });
});
