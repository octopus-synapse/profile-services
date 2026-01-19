/**
 * Domain Exception Filter Tests
 *
 * Tests for DomainException handling in AllExceptionsFilter
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { AllExceptionsFilter } from './http-exception.filter';
import {
  ResourceNotFoundError,
  PermissionDeniedError,
  ConflictError,
  DomainValidationError,
  AuthenticationError,
} from '@octopus-synapse/profile-contracts';
import type { ArgumentsHost } from '@nestjs/common';

describe('AllExceptionsFilter - Domain Exceptions', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: {
    status: ReturnType<typeof mock>;
    json: ReturnType<typeof mock>;
  };
  let mockRequest: { url: string; method: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    const mockLogger = {
      log: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {}),
    } as any;

    filter = new AllExceptionsFilter(mockLogger);

    mockResponse = {
      status: mock(() => mockResponse),
      json: mock(() => {}),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockHost = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  it('should handle ResourceNotFoundError with 404 status', () => {
    const error = new ResourceNotFoundError('Resume', 'resume-123');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resume with identifier "resume-123" not found',
        details: expect.objectContaining({
          resource: 'Resume',
          identifier: 'resume-123',
          path: '/api/test',
          method: 'GET',
        }),
      },
    });
  });

  it('should handle PermissionDeniedError with 403 status', () => {
    const error = new PermissionDeniedError('edit', 'resume');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Permission denied: cannot edit resume',
        details: expect.objectContaining({
          action: 'edit',
          resource: 'resume',
        }),
      },
    });
  });

  it('should handle ConflictError with 409 status', () => {
    const error = new ConflictError('Username already exists');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Username already exists',
        details: expect.objectContaining({
          path: '/api/test',
        }),
      },
    });
  });

  it('should handle DomainValidationError with 400 status', () => {
    const error = new DomainValidationError('Invalid email format', {
      field: 'email',
    });

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        details: expect.objectContaining({
          field: 'email',
        }),
      },
    });
  });

  it('should handle AuthenticationError with 401 status', () => {
    const error = new AuthenticationError('Session expired');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Session expired',
        details: expect.objectContaining({
          path: '/api/test',
        }),
      },
    });
  });
});
