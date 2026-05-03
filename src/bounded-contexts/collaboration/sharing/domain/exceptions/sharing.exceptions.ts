import { EntityNotFoundException } from '@/shared-kernel/exceptions';

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
