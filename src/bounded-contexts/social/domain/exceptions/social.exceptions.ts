/**
 * Social Bounded Context Exceptions
 *
 * Covers follow, connection, and blocking relationships.
 */
import { ConflictException, ValidationException } from '@/shared-kernel/exceptions';

export class CannotConnectWithSelfException extends ValidationException {
  override readonly code: string = 'CANNOT_CONNECT_WITH_SELF';
  constructor() {
    super('Cannot connect with yourself');
  }
}

export class CannotFollowSelfException extends ValidationException {
  override readonly code: string = 'CANNOT_FOLLOW_SELF';
  constructor() {
    super('Cannot follow yourself');
  }
}

export class AlreadyFollowingException extends ConflictException {
  override readonly code: string = 'ALREADY_FOLLOWING';
  constructor() {
    super('Already following this user');
  }
}

export class AlreadyConnectedException extends ConflictException {
  override readonly code: string = 'ALREADY_CONNECTED';
  constructor() {
    super('Already connected with this user');
  }
}

export class ConnectionRequestPendingException extends ConflictException {
  override readonly code: string = 'CONNECTION_REQUEST_PENDING';
  constructor() {
    super('Connection request already pending');
  }
}

export class ConnectionRequestExistsException extends ConflictException {
  override readonly code: string = 'CONNECTION_REQUEST_EXISTS';
  constructor() {
    super('Connection request already exists');
  }
}

export class ConnectionNotPendingException extends ValidationException {
  override readonly code: string = 'CONNECTION_NOT_PENDING';
  constructor() {
    super('Connection request is not pending');
  }
}

export class ConnectionNotAcceptedException extends ValidationException {
  override readonly code: string = 'CONNECTION_NOT_ACCEPTED';
  constructor() {
    super('Connection is not accepted');
  }
}

export class NotPartOfConnectionException extends ValidationException {
  override readonly code: string = 'NOT_PART_OF_CONNECTION';
  constructor() {
    super('You are not part of this connection');
  }
}

export class NotConnectionTargetException extends ValidationException {
  override readonly code: string = 'NOT_CONNECTION_TARGET';
  constructor(action: 'accept' | 'reject') {
    super(`Only the target user can ${action} a connection request`);
  }
}

export class NotConnectionRequesterException extends ValidationException {
  override readonly code: string = 'NOT_CONNECTION_REQUESTER';
  constructor() {
    super('Only the requester can withdraw a sent request');
  }
}
