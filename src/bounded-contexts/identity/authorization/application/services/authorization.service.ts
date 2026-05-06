/**
 * Authorization Service (Application Layer)
 *
 * Application service that orchestrates authorization use cases.
 * This is the primary entry point for permission checking in the application.
 *
 * Single Responsibility: Coordinate permission resolution and caching.
 *
 * Design Decisions:
 * - Uses in-memory cache for resolved contexts (configurable TTL)
 * - Delegates resolution to domain service
 * - Provides simple API for guards and controllers
 */

import { UserAuthContext, type UserId } from '../../domain/entities/user-auth-context.entity';
import type {
  IPermissionRepository,
  IRoleRepository,
  IUserAuthorizationRepository,
} from '../../domain/ports/authorization-repositories.port';
import { PermissionResolverService } from '../../domain/services/permission-resolver.service';

// ============================================================================
// Cache Configuration
// ============================================================================
//
// P2-093 — pull the 60s TTL from the canonical `CACHE_PRESETS.EPHEMERAL`
// instead of redeclaring it locally. Same value, single source of truth.

import { CACHE_PRESETS } from '@/shared-kernel/cache/cache-ttl.const';

const DEFAULT_CACHE_TTL_SECONDS = CACHE_PRESETS.EPHEMERAL;
const MAX_CACHE_SIZE = 1000;

interface CacheEntry {
  context: UserAuthContext;
  expiresAt: number;
}

// ============================================================================
// Service
// ============================================================================

import { AuthorizationServicePort } from '../ports/authorization-service.port';

export class AuthorizationService extends AuthorizationServicePort {
  private readonly cache = new Map<UserId, CacheEntry>();
  private readonly resolver: PermissionResolverService;

  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly userAuthRepo: IUserAuthorizationRepository,
  ) {
    super();
    this.resolver = new PermissionResolverService(permissionRepo, roleRepo, userAuthRepo);
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: UserId, resource: string, action: string): Promise<boolean> {
    const context = await this.getContext(userId);
    return context.hasPermission(resource, action);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const context = await this.getContext(userId);
    return context.hasAnyPermission(permissions);
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const context = await this.getContext(userId);
    return context.hasAllPermissions(permissions);
  }

  /**
   * Get user's complete authorization context
   */
  async getContext(userId: UserId): Promise<UserAuthContext> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.context;
    }

    // Resolve fresh context
    const context = await this.resolver.resolveUserContext(userId);

    // Cache the result
    this.cacheContext(userId, context);

    return context;
  }

  /**
   * Invalidate cached context for a user
   * Call this when user's permissions change
   */
  invalidateCache(userId: UserId): void {
    this.cache.delete(userId);
  }

  /**
   * Invalidate all cached contexts
   * Call this when roles or groups change
   */
  invalidateAllCaches(): void {
    this.cache.clear();
  }

  // ============================================================================
  // Introspection
  // ============================================================================

  /**
   * Get all permissions a user has for a specific resource
   */
  async getResourcePermissions(userId: UserId, resource: string): Promise<string[]> {
    const context = await this.getContext(userId);
    return context.getResourcePermissions(resource).map((p) => p.permission.action);
  }

  /**
   * Get all granted permission keys for a user
   */
  async getAllPermissions(userId: UserId): Promise<string[]> {
    const context = await this.getContext(userId);
    return context.grantedPermissionKeys;
  }

  /**
   * Check if user has a specific role (by ID or name)
   */
  async hasRole(userId: UserId, roleIdOrName: string): Promise<boolean> {
    const context = await this.getContext(userId);

    // Check by ID first
    if (context.hasRole(roleIdOrName)) {
      return true;
    }

    // Check by name
    const role = await this.roleRepo.findByName(roleIdOrName);
    if (role) {
      return context.hasRole(role.id);
    }

    return false;
  }

  // ============================================================================
  // Admin Helpers (for user statistics)
  // ============================================================================

  /**
   * Count users with a specific role
   */
  async countUsersWithRole(roleName: string): Promise<number> {
    return this.userAuthRepo.countUsersWithRoleName(roleName);
  }

  /**
   * Check if user is the last admin (for preventing last admin deletion)
   */
  async isLastAdmin(userId: UserId): Promise<boolean> {
    const isAdmin = await this.hasRole(userId, 'admin');
    if (!isAdmin) return false;

    const adminCount = await this.countUsersWithRole('admin');
    return adminCount <= 1;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private cacheContext(userId: UserId, context: UserAuthContext): void {
    // Enforce max cache size (LRU-like eviction)
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value as UserId | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(userId, { context, expiresAt: Date.now() + DEFAULT_CACHE_TTL_SECONDS * 1000 });
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: MAX_CACHE_SIZE };
  }
}
