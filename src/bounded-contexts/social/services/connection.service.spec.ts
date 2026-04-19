/**
 * ConnectionService Tests — port-level in-memory fakes.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryConnectionRepository, InMemorySocialLogger } from '../testing';
import { ConnectionService } from './connection.service';

describe('ConnectionService', () => {
  let service: ConnectionService;
  let connectionRepo: InMemoryConnectionRepository;
  let eventPublisher: EventPublisherPort;

  beforeEach(() => {
    connectionRepo = new InMemoryConnectionRepository();
    eventPublisher = {
      publish: mock(<T>(_event: DomainEvent<T>) => {}),
      publishAsync: mock(async <T>(_event: DomainEvent<T>) => {}),
    };
    service = new ConnectionService(connectionRepo, eventPublisher, new InMemorySocialLogger());
  });

  describe('sendConnectionRequest', () => {
    it('should create a connection request', async () => {
      connectionRepo.seedUser({
        id: 'user-2',
        name: 'Two',
        username: 'two',
        photoURL: null,
      });

      const result = await service.sendConnectionRequest('user-1', 'user-2');

      expect(result.status).toBe('PENDING');
      expect(result.requesterId).toBe('user-1');
      expect(result.targetId).toBe('user-2');
    });

    it('should throw ValidationException when trying to connect with yourself', async () => {
      await expect(service.sendConnectionRequest('user-1', 'user-1')).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw EntityNotFoundException when target user does not exist', async () => {
      await expect(service.sendConnectionRequest('user-1', 'nonexistent')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw ConflictException when already connected', async () => {
      connectionRepo.seedUser({
        id: 'user-2',
        name: 'Two',
        username: 'two',
        photoURL: null,
      });
      connectionRepo.seedConnection({
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
      });

      await expect(service.sendConnectionRequest('user-1', 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when request already pending', async () => {
      connectionRepo.seedUser({
        id: 'user-2',
        name: 'Two',
        username: 'two',
        photoURL: null,
      });
      connectionRepo.seedConnection({
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
      });

      await expect(service.sendConnectionRequest('user-1', 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('acceptConnection', () => {
    it('should accept a pending connection request', async () => {
      connectionRepo.seedConnection({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
      });

      const result = await service.acceptConnection('conn-1', 'user-2');

      expect(result.status).toBe('ACCEPTED');
    });

    it('should throw EntityNotFoundException when connection does not exist', async () => {
      await expect(service.acceptConnection('nonexistent', 'user-2')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw ValidationException when connection is not pending', async () => {
      connectionRepo.seedConnection({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
      });

      await expect(service.acceptConnection('conn-1', 'user-2')).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when current user is not the target', async () => {
      connectionRepo.seedConnection({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
      });

      await expect(service.acceptConnection('conn-1', 'user-3')).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('rejectConnection', () => {
    it('should reject a pending connection', async () => {
      connectionRepo.seedConnection({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
      });

      const result = await service.rejectConnection('conn-1', 'user-2');

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('removeConnection', () => {
    it('should remove an accepted connection', async () => {
      connectionRepo.seedConnection({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
      });

      await service.removeConnection('conn-1', 'user-1');

      expect(connectionRepo.getAll()).toHaveLength(0);
    });

    it('should throw ValidationException when connection is not accepted', async () => {
      connectionRepo.seedConnection({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
      });

      await expect(service.removeConnection('conn-1', 'user-1')).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('getPendingRequests', () => {
    it('should return paginated pending requests', async () => {
      connectionRepo.seedConnection({
        requesterId: 'user-2',
        targetId: 'user-1',
        status: 'PENDING',
      });
      connectionRepo.seedConnection({
        requesterId: 'user-3',
        targetId: 'user-1',
        status: 'PENDING',
      });

      const result = await service.getPendingRequests('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
    });
  });

  describe('getConnections', () => {
    it('should return accepted connections', async () => {
      connectionRepo.seedConnection({
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
      });

      const result = await service.getConnections('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('isConnected', () => {
    it('should return true when users are connected', async () => {
      connectionRepo.seedConnection({
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
      });

      expect(await service.isConnected('user-1', 'user-2')).toBe(true);
    });

    it('should return false when users are not connected', async () => {
      expect(await service.isConnected('user-1', 'user-2')).toBe(false);
    });
  });

  describe('getConnectionStats', () => {
    it('should return connection count', async () => {
      connectionRepo.seedConnection({
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
      });

      const stats = await service.getConnectionStats('user-1');

      expect(stats.connections).toBe(1);
    });
  });
});
