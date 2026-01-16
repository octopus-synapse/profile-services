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

import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '../domain/services/permission-resolver.service';
import {
  UserAuthContext,
  type UserId,
} from '../domain/entities/user-auth-context.entity';
import { PermissionRepository } from '../infrastructure/repositories/permission.repository';
import { RoleRepository } from '../infrastructure/repositories/role.repository';
import { GroupRepository } from '../infrastructure/repositories/group.repository';
import { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';

// ============================================================================
// Cache Configuration
// ============================================================================

const DEFAULT_CACHE_TTL_SECONDS = 60; // 1 minute
const MAX_CACHE_SIZE = 1000;

interface CacheEntry {
  context: UserAuthContext;
  expiresAt: number;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class AuthorizationService {
  private readonly cache = new Map<UserId, CacheEntry>();
  private readonly resolver: PermissionResolverService;

  constructor(
    private readonly permissionRepo: PermissionRepository,
    private readonly roleRepo: RoleRepository,
    private readonly groupRepo: GroupRepository,
    private readonly userAuthRepo: UserAuthorizationRepository,
  ) {
    this.resolver = new PermissionResolverService(
      permissionRepo,
      roleRepo,
      groupRepo,
      userAuthRepo,
    );
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: UserId,
    resource: string,
    action: string,
  ): Promise<boolean> {
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
  async getResourcePermissions(
    userId: UserId,
    resource: string,
  ): Promise<string[]> {
    const context = await this.getContext(userId);
    return context
      .getResourcePermissions(resource)
      .map((p) => p.permission.action);
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

  /**
   * Check if user belongs to a group (by ID or name)
   */
  async inGroup(userId: UserId, groupIdOrName: string): Promise<boolean> {
    const context = await this.getContext(userId);

    // Check by ID first
    if (context.inGroup(groupIdOrName)) {
      return true;
    }

    // Check by name
    const group = await this.groupRepo.findByName(groupIdOrName);
    if (group) {
      return context.inGroup(group.id);
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

    this.cache.set(userId, {
      context,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL_SECONDS * 1000,
    });
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
    };
  }
}
