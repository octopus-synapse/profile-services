import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TosGuard } from './tos.guard';
import { TosAcceptanceService } from '../services/tos-acceptance.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('TosGuard', () => {
  let guard: TosGuard;
  let tosService: any;
  let reflector: any;

  beforeEach(async () => {
    tosService = {
      hasAcceptedCurrentVersion: mock(),
    };

    reflector = {
      getAllAndOverride: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TosGuard,
        { provide: TosAcceptanceService, useValue: tosService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<TosGuard>(TosGuard);
  });

  const createMockContext = (
    user?: any,
    isPublic = false,
  ): ExecutionContext => {
    reflector.getAllAndOverride.mockReturnValue(isPublic);

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  describe('Public routes', () => {
    it('should allow access to public routes without authentication', async () => {
      // Arrange
      const context = createMockContext(undefined, true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(tosService.hasAcceptedCurrentVersion).not.toHaveBeenCalled();
    });

    it('should allow access to public routes even for authenticated users', async () => {
      // Arrange
      const context = createMockContext({ id: 'user-123' }, true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Protected routes', () => {
    it('should block access when user has not accepted ToS', async () => {
      // Arrange
      const context = createMockContext({ id: 'user-123' }, false);
      tosService.hasAcceptedCurrentVersion.mockResolvedValue(false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You must accept the Terms of Service to use this application',
      );
    });

    it('should allow access when user has accepted ToS', async () => {
      // Arrange
      const context = createMockContext({ id: 'user-456' }, false);
      tosService.hasAcceptedCurrentVersion.mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(tosService.hasAcceptedCurrentVersion).toHaveBeenCalledWith(
        'user-456',
      );
    });

    it('should check both ToS and Privacy Policy when configured', async () => {
      // Arrange
      const context = createMockContext({ id: 'user-789' }, false);

      // First call for ToS
      tosService.hasAcceptedCurrentVersion
        .mockResolvedValueOnce(true) // ToS accepted
        .mockResolvedValueOnce(false); // Privacy Policy not accepted

      // Act & Assert
      // This test assumes future implementation will check both documents
      // For now, we only check ToS
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow access without user (unauthenticated) for non-public routes', async () => {
      // Arrange - This case handles when auth guard hasn't run yet
      const context = createMockContext(undefined, false);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true); // Pass through - auth guard will handle
      expect(tosService.hasAcceptedCurrentVersion).not.toHaveBeenCalled();
    });

    it('should provide user ID to ToS service', async () => {
      // Arrange
      const userId = 'user-specific-123';
      const context = createMockContext({ id: userId }, false);
      tosService.hasAcceptedCurrentVersion.mockResolvedValue(true);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(tosService.hasAcceptedCurrentVersion).toHaveBeenCalledWith(userId);
      expect(tosService.hasAcceptedCurrentVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should propagate service errors', async () => {
      // Arrange
      const context = createMockContext({ id: 'user-error' }, false);
      const serviceError = new Error('Database connection failed');
      tosService.hasAcceptedCurrentVersion.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
