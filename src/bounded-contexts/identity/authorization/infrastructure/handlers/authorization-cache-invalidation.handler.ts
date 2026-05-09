import type { LoggerPort } from '@/shared-kernel';
import type { AuthorizationService } from '../../application/services/authorization.service';
import type {
  PermissionDeniedEvent,
  PermissionGrantedEvent,
  RoleAssignedEvent,
  RoleRevokedEvent,
} from '../../domain/events';

export class AuthorizationCacheInvalidationHandler {
  constructor(
    private readonly authService: AuthorizationService,
    private readonly logger?: LoggerPort,
  ) {}

  handleRoleAssigned(event: RoleAssignedEvent): void {
    this.invalidate(event.aggregateId, 'RoleAssigned');
  }

  handleRoleRevoked(event: RoleRevokedEvent): void {
    this.invalidate(event.aggregateId, 'RoleRevoked');
  }

  handlePermissionGranted(event: PermissionGrantedEvent): void {
    this.invalidate(event.aggregateId, 'PermissionGranted');
  }

  handlePermissionDenied(event: PermissionDeniedEvent): void {
    this.invalidate(event.aggregateId, 'PermissionDenied');
  }

  private invalidate(userId: string, reason: string): void {
    this.authService.invalidateCache(userId);
    this.logger?.debug(
      `Invalidated authorization context cache for user ${userId}`,
      'AuthorizationCacheInvalidationHandler',
      { reason },
    );
  }
}
