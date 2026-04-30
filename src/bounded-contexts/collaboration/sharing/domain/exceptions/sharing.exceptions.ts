import { EntityNotFoundException, ValidationException } from '@/shared-kernel/exceptions';

/** Owner tried to invite themselves as a collaborator. */
export class CollaboratorSelfInviteException extends ValidationException {
  readonly code: string = 'COLLABORATOR_SELF_INVITE';
  constructor() {
    super('Cannot add yourself as a collaborator');
  }
}

/** Comment thread reference resolved to no row. */
export class CollaboratorParentCommentNotFoundException extends EntityNotFoundException {
  readonly code: string = 'COLLABORATOR_PARENT_COMMENT_NOT_FOUND';
  constructor(commentId?: string) {
    super('ParentComment', commentId);
  }
}

/** Comment lookup by id resolved to no row (or already deleted). */
export class CollaboratorCommentNotFoundException extends EntityNotFoundException {
  readonly code: string = 'COLLABORATOR_COMMENT_NOT_FOUND';
  constructor(commentId?: string) {
    super('Comment', commentId);
  }
}
