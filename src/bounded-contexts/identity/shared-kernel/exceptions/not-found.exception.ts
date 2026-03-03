/**
 * Entity Not Found Exception
 *
 * Thrown when an entity is not found in the repository.
 * Maps to HTTP 404.
 */
import { DomainException } from './domain.exception';

export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';
  readonly statusHint = 404;

  constructor(entityName: string, identifier?: string) {
    const message = identifier
      ? `${entityName} with identifier "${identifier}" not found`
      : `${entityName} not found`;
    super(message);
  }
}
