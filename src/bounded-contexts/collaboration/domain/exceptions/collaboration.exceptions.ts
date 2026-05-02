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

// Reservado: endorsement de skills hoje vive em `social/skill-endorsement.service`,
// não em collaboration BC. Esta exception ficará aqui até o "skill endorsement
// dentro de comentários colaborativos" ser implementado (commit/issue futuro).
// Throwed por essa camada nova quando ela chegar.
export class AlreadyEndorsedException extends ConflictException {
  readonly code: string = 'ALREADY_ENDORSED';
  constructor() {
    super('You have already endorsed this skill for this user');
  }
}

// Reservado: idem AlreadyEndorsedException — endorsement vive em social BC,
// será throwed pela camada futura de endorsement em comentários colaborativos.
export class CannotEndorseSelfException extends ValidationException {
  readonly code: string = 'CANNOT_ENDORSE_SELF';
  constructor() {
    super('You cannot endorse your own skills');
  }
}

export class CollaboratorLimitReachedException extends ConflictException {
  readonly code: string = 'COLLABORATOR_LIMIT_REACHED';
  constructor(max: number) {
    super(`Collaborator limit reached (${max})`);
  }
}

export class CollaboratorAlreadyInvitedException extends ConflictException {
  readonly code: string = 'COLLABORATOR_ALREADY_INVITED';
  constructor() {
    super('This user is already a collaborator');
  }
}

export class CannotInviteSelfAsCollaboratorException extends ValidationException {
  readonly code: string = 'CANNOT_INVITE_SELF_AS_COLLABORATOR';
  constructor() {
    super('Cannot add yourself as a collaborator');
  }
}

export class ResumeNotFoundForCollaborationException extends EntityNotFoundException {
  readonly code: string = 'RESUME_NOT_FOUND_FOR_COLLABORATION';
  constructor(resumeId: string) {
    super('Resume', resumeId);
  }
}

// Reservado: feature de "recommendations" colaborativas (ainda sem use-case
// ou serviço — nem tabela Prisma dedicada). Throwed por essa camada quando
// o módulo de recommendations dentro de collaboration for implementado.
export class RecommendationAlreadyWrittenException extends ConflictException {
  readonly code: string = 'RECOMMENDATION_ALREADY_WRITTEN';
  constructor() {
    super('You have already written a recommendation for this user');
  }
}

// Reservado: idem RecommendationAlreadyWrittenException — feature de
// recommendations colaborativas ainda não tem camada implementada.
export class CannotRecommendSelfException extends ValidationException {
  readonly code: string = 'CANNOT_RECOMMEND_SELF';
  constructor() {
    super('You cannot write a recommendation for yourself');
  }
}

export class CannotBlockSelfException extends ValidationException {
  readonly code: string = 'CANNOT_BLOCK_SELF';
  constructor() {
    super('You cannot block yourself');
  }
}

export class AlreadyBlockedException extends ConflictException {
  readonly code: string = 'ALREADY_BLOCKED';
  constructor() {
    super('This user is already blocked');
  }
}

export class BlockNotFoundException extends ValidationException {
  readonly code: string = 'BLOCK_NOT_FOUND';
  constructor() {
    super('This user is not blocked');
  }
}

// Reservado: redundante com CannotDeleteAnotherUsersCommentException, que já é
// throwed por collab-comment.service.delete. Quando uma rota de "edit comment"
// for adicionada (commit/issue futuro), essa será throwed na guarda de
// ownership do path de edição.
export class CommentNotOwnedException extends ForbiddenException {
  readonly code: string = 'COMMENT_NOT_OWNED';
  constructor() {
    super('You can only modify your own comments');
  }
}

export class CommentThreadClosedException extends ValidationException {
  readonly code: string = 'COMMENT_THREAD_CLOSED';
  constructor() {
    super('This comment thread is closed');
  }
}

// Reservado: feature de "moderation reports" colaborativos (denúncias por
// outros usuários) ainda não tem camada implementada — sem service ou
// use-case. Throwed por essa camada futura.
export class ReportAlreadySubmittedException extends ConflictException {
  readonly code: string = 'REPORT_ALREADY_SUBMITTED';
  constructor() {
    super('You have already reported this item');
  }
}

// Reservado: idem ReportAlreadySubmittedException — throwed por uma camada
// futura de moderation que ainda não existe.
export class ReportNotReviewableException extends ValidationException {
  readonly code: string = 'REPORT_NOT_REVIEWABLE';
  constructor() {
    super('This report is not in a reviewable state');
  }
}

export class NotConversationParticipantException extends ForbiddenException {
  readonly code: string = 'NOT_CONVERSATION_PARTICIPANT';
  constructor() {
    super('Not a participant of this conversation');
  }
}

export class CannotSendMessageToUserException extends ForbiddenException {
  readonly code: string = 'CANNOT_SEND_MESSAGE_TO_USER';
  constructor() {
    super('Cannot send message to this user');
  }
}

export class CannotMessageSelfException extends ValidationException {
  readonly code: string = 'CANNOT_MESSAGE_SELF';
  constructor() {
    super('Cannot send message to yourself');
  }
}

export class ResumeAccessDeniedException extends ForbiddenException {
  readonly code: string = 'RESUME_ACCESS_DENIED';
  constructor() {
    super('Access denied to this resume');
  }
}

export class OnlyResumeOwnerCanInviteException extends ForbiddenException {
  readonly code: string = 'ONLY_RESUME_OWNER_CAN_INVITE';
  constructor() {
    super('Only resume owner can invite collaborators');
  }
}

export class OnlyResumeOwnerOrSelfCanRemoveException extends ForbiddenException {
  readonly code: string = 'ONLY_RESUME_OWNER_OR_SELF_CAN_REMOVE';
  constructor() {
    super('Only owner can remove collaborators, or you can remove yourself');
  }
}

export class OnlyResumeOwnerCanUpdateRolesException extends ForbiddenException {
  readonly code: string = 'ONLY_RESUME_OWNER_CAN_UPDATE_ROLES';
  constructor() {
    super('Only resume owner can update roles');
  }
}

export class CannotDeleteAnotherUsersCommentException extends ForbiddenException {
  readonly code: string = 'CANNOT_DELETE_ANOTHER_USERS_COMMENT';
  constructor() {
    super('Cannot delete another user comment');
  }
}

export class NotACollaboratorException extends ForbiddenException {
  readonly code: string = 'NOT_A_COLLABORATOR';
  constructor() {
    super('Not a collaborator on this resume');
  }
}
