import { EntityNotFoundException, ValidationException } from '@/shared-kernel/exceptions';

/**
 * Owner tried to invite themselves as a collaborator.
 *
 * Reservado: redundante com `CannotInviteSelfAsCollaboratorException` da
 * pasta domain/exceptions do BC pai (já throwed por
 * `invite-collaborator.use-case`). Mantida aqui como exemplo do padrão
 * "exception local da subdomain sharing"; será throwed por uma camada
 * futura caso sharing precise divergir do BC pai (ex.: link público
 * compartilhado em commit/issue futuro).
 */
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
