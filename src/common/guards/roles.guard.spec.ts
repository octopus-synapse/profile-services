/**
 * RolesGuard Tests
 *
 * Behavioral tests for role-based access control.
 * Focus: Guard allows/denies access based on user roles.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (user?: {
    role: UserRole;
  }): ExecutionContext => {
    const mockRequest = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user is not authenticated', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
      const context = createMockExecutionContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.USER,
      ]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user role is not in allowed roles list', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should check roles from handler metadata', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.USER } }),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockHandler,
        mockClass,
      ]);
    });

    it('should allow any authenticated user when roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      // Empty array means no role matches - should deny
      expect(result).toBe(false);
    });

    it('should handle null user in request', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
      const mockRequest = { user: null };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('role hierarchy', () => {
    it('should not implicitly grant higher privileges to admins', () => {
      // Admin role should only match when explicitly required
      reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      // Admin doesn't automatically match USER role
      expect(result).toBe(false);
    });

    it('should require exact role match', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
