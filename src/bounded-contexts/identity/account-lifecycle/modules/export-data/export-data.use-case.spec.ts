/**
 * Export Data Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import { InMemoryAuditLogger, InMemoryDataExportRepository } from '../../../shared-kernel/testing';
import { ExportDataUseCase } from './export-data.use-case';

describe('ExportDataUseCase', () => {
  let useCase: ExportDataUseCase;
  let repository: InMemoryDataExportRepository;
  let auditLogger: InMemoryAuditLogger;

  const userId = 'user-123';
  const mockUser = {
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    hasCompletedOnboarding: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    repository = new InMemoryDataExportRepository();
    auditLogger = new InMemoryAuditLogger();

    // Seed default data
    repository.seedUser(mockUser);
    repository.seedConsents(userId, [
      {
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0',
        acceptedAt: new Date('2024-01-01'),
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent',
      },
    ]);

    useCase = new ExportDataUseCase(repository, auditLogger);
  });

  it('should export all user data', async () => {
    const result = await useCase.execute(userId);

    expect(result.user.id).toBe(userId);
    expect(result.user.email).toBe('test@example.com');
    expect(result.exportedAt).toBeDefined();
    expect(result.dataRetentionPolicy).toContain('GDPR Article 17');
  });

  it('should throw if user not found', async () => {
    repository.clear();

    await expect(useCase.execute(userId)).rejects.toThrow(EntityNotFoundException);
  });

  it('should log export request', async () => {
    await useCase.execute(userId, '127.0.0.1', 'TestAgent');

    expect(auditLogger.hasExportRequested(userId)).toBe(true);

    const entry = auditLogger.getLastExportEntry();
    expect(entry?.userId).toBe(userId);
    expect(entry?.ipAddress).toBe('127.0.0.1');
    expect(entry?.userAgent).toBe('TestAgent');
  });

  it('should format dates as ISO strings', async () => {
    const result = await useCase.execute(userId);

    expect(result.user.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.consents[0].acceptedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should include all consents in export', async () => {
    repository.seedConsents(userId, [
      {
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0',
        acceptedAt: new Date('2024-01-01'),
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent',
      },
      {
        documentType: 'PRIVACY_POLICY',
        version: '2.0',
        acceptedAt: new Date('2024-01-02'),
        ipAddress: null,
        userAgent: null,
      },
    ]);

    const result = await useCase.execute(userId);

    expect(result.consents).toHaveLength(2);
  });
});
