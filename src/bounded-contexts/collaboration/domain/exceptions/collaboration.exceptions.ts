/**
 * Collaboration Bounded Context Exceptions
 *
 * Covers resume sharing with collaborators, comments, endorsements,
 * recommendations, and moderation (reports, blocks).
 */
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class CollaboratorLimitReachedException extends ConflictException {
  override readonly code: string = 'COLLABORATOR_LIMIT_REACHED';
  constructor(max: number) {
    super(`Collaborator limit reached (${max})`);
  }
}

export class CollaboratorAlreadyInvitedException extends ConflictException {
  override readonly code: string = 'COLLABORATOR_ALREADY_INVITED';
  constructor() {
    super('This user is already a collaborator');
  }
}

export class CannotInviteSelfAsCollaboratorException extends ValidationException {
  override readonly code: string = 'CANNOT_INVITE_SELF_AS_COLLABORATOR';
  constructor() {
    super('Cannot add yourself as a collaborator');
  }
}

export class ResumeNotFoundForCollaborationException extends EntityNotFoundException {
  override readonly code: string = 'RESUME_NOT_FOUND_FOR_COLLABORATION';
  constructor(resumeId: string) {
    super('Resume', resumeId);
  }
}

export class CannotBlockSelfException extends ValidationException {
  override readonly code: string = 'CANNOT_BLOCK_SELF';
  constructor() {
    super('You cannot block yourself');
  }
}

export class AlreadyBlockedException extends ConflictException {
  override readonly code: string = 'ALREADY_BLOCKED';
  constructor() {
    super('This user is already blocked');
  }
}

export class BlockNotFoundException extends ValidationException {
  override readonly code: string = 'BLOCK_NOT_FOUND';
  constructor() {
    super('This user is not blocked');
  }
}

export class CommentThreadClosedException extends ValidationException {
  override readonly code: string = 'COMMENT_THREAD_CLOSED';
  constructor() {
    super('This comment thread is closed');
  }
}

export class NotConversationParticipantException extends ForbiddenException {
  override readonly code: string = 'NOT_CONVERSATION_PARTICIPANT';
  constructor() {
    super('Not a participant of this conversation');
  }
}

export class CannotSendMessageToUserException extends ForbiddenException {
  override readonly code: string = 'CANNOT_SEND_MESSAGE_TO_USER';
  constructor() {
    super('Cannot send message to this user');
  }
}

export class CannotMessageSelfException extends ValidationException {
  override readonly code: string = 'CANNOT_MESSAGE_SELF';
  constructor() {
    super('Cannot send message to yourself');
  }
}

export class ResumeAccessDeniedException extends ForbiddenException {
  override readonly code: string = 'RESUME_ACCESS_DENIED';
  constructor() {
    super('Access denied to this resume');
  }
}

export class OnlyResumeOwnerCanInviteException extends ForbiddenException {
  override readonly code: string = 'ONLY_RESUME_OWNER_CAN_INVITE';
  constructor() {
    super('Only resume owner can invite collaborators');
  }
}

export class OnlyResumeOwnerOrSelfCanRemoveException extends ForbiddenException {
  override readonly code: string = 'ONLY_RESUME_OWNER_OR_SELF_CAN_REMOVE';
  constructor() {
    super('Only owner can remove collaborators, or you can remove yourself');
  }
}

export class OnlyResumeOwnerCanUpdateRolesException extends ForbiddenException {
  override readonly code: string = 'ONLY_RESUME_OWNER_CAN_UPDATE_ROLES';
  constructor() {
    super('Only resume owner can update roles');
  }
}

export class CannotDeleteAnotherUsersCommentException extends ForbiddenException {
  override readonly code: string = 'CANNOT_DELETE_ANOTHER_USERS_COMMENT';
  constructor() {
    super('Cannot delete another user comment');
  }
}

export class NotACollaboratorException extends ForbiddenException {
  override readonly code: string = 'NOT_A_COLLABORATOR';
  constructor() {
    super('Not a collaborator on this resume');
  }
}
