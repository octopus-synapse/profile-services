/**
 * Collaboration Bounded Context Exceptions
 *
 * Covers resume sharing with collaborators, comments, endorsements,
 * recommendations, and moderation (reports, blocks).
 */
import {
  ConflictException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class AlreadyEndorsedException extends ConflictException {
  readonly code: string = 'ALREADY_ENDORSED';
  constructor() {
    super('You have already endorsed this skill for this user');
  }
}

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

export class RecommendationAlreadyWrittenException extends ConflictException {
  readonly code: string = 'RECOMMENDATION_ALREADY_WRITTEN';
  constructor() {
    super('You have already written a recommendation for this user');
  }
}

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

export class ReportAlreadySubmittedException extends ConflictException {
  readonly code: string = 'REPORT_ALREADY_SUBMITTED';
  constructor() {
    super('You have already reported this item');
  }
}

export class ReportNotReviewableException extends ValidationException {
  readonly code: string = 'REPORT_NOT_REVIEWABLE';
  constructor() {
    super('This report is not in a reviewable state');
  }
}
