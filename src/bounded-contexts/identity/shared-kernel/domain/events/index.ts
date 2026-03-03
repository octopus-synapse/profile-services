/**
 * Domain Events - Identity Shared Kernel
 */

export { DomainEvent } from './domain-event.base';
export {
  UserDeletedEvent,
  type UserDeletedPayload,
} from './user-deleted.event';
export {
  UserRegisteredEvent,
  type UserRegisteredPayload,
} from './user-registered.event';
