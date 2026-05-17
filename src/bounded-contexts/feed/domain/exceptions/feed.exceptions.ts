/**
 * Feed Bounded Context Exceptions
 */
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions';

export class PollClosedException extends DomainException {
  readonly code: string = 'POLL_CLOSED';
  readonly statusHint = 400;
  constructor() {
    super('This poll is closed to new votes');
  }
}

export class PollAlreadyVotedException extends ConflictException {
  override readonly code: string = 'POLL_ALREADY_VOTED';
  constructor() {
    super('You have already voted on this poll');
  }
}

export class PollOptionOutOfRangeException extends DomainException {
  readonly code: string = 'POLL_OPTION_OUT_OF_RANGE';
  readonly statusHint = 400;
  constructor(optionIndex: number, optionCount: number) {
    super(`Option index ${optionIndex} is out of range for a poll with ${optionCount} options`);
  }
}

export class CannotDeleteOthersPostException extends ForbiddenException {
  override readonly code: string = 'CANNOT_DELETE_OTHERS_POST';
  constructor() {
    super('You can only delete your own posts');
  }
}

export class CannotDeleteOthersCommentException extends ForbiddenException {
  override readonly code: string = 'CANNOT_DELETE_OTHERS_COMMENT';
  constructor() {
    super('You can only delete your own comments');
  }
}

export class PostAlreadyRepostedException extends ConflictException {
  override readonly code: string = 'POST_ALREADY_REPOSTED';
  constructor() {
    super('You have already reposted this post');
  }
}

export class PostAlreadyReportedException extends ConflictException {
  override readonly code: string = 'POST_ALREADY_REPORTED';
  constructor() {
    super('You have already reported this post');
  }
}

export class FileRequiredException extends DomainException {
  readonly code: string = 'FILE_REQUIRED';
  readonly statusHint = 400;
  constructor() {
    super('File is required for this operation');
  }
}

export class FileTooLargeException extends DomainException {
  readonly code: string = 'FILE_TOO_LARGE';
  readonly statusHint = 400;
  constructor(maxBytes: number) {
    super(`File exceeds maximum size of ${maxBytes} bytes`);
  }
}

export class InvalidFileTypeException extends DomainException {
  readonly code: string = 'INVALID_FILE_TYPE';
  readonly statusHint = 400;
  constructor(allowedTypes: string[]) {
    super(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

export class FileUploadUnavailableException extends DomainException {
  readonly code: string = 'FILE_UPLOAD_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('File upload service is currently unavailable');
  }
}

export class PostNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'POST_NOT_FOUND';
  constructor(postId: string) {
    super('Post', postId);
  }
}

export class PostLikeNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'POST_LIKE_NOT_FOUND';
  constructor(postId: string) {
    super('Like', postId);
  }
}

export class PostBookmarkNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'POST_BOOKMARK_NOT_FOUND';
  constructor(postId: string) {
    super('Bookmark', postId);
  }
}
