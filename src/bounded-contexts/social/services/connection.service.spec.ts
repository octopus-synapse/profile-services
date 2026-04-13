/**
 * ConnectionService Tests
 *
 * Clean architecture: Stub Prisma, Pure Bun tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConnectionService } from './connection.service';

/**
 * Connection record type
 */
interface ConnectionRecord {
  id: string;
  requesterId: string;
  targetId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requester?: { id: string; name: string | null };
  target?: { id: string; name: string | null };
}

/**
 * User record type
 */
interface UserRecord {
  id: string;
  name: string | null;
  isActive?: boolean;
}

/**
 * Stub Prisma Service for testing
 */
class StubPrismaService {
  private connectionCreateResult: ConnectionRecord | null = null;
  private connectionFindUniqueResult: ConnectionRecord | null = null;
  private connectionFindFirstResult: ConnectionRecord | null = null;
  private connectionFindManyResult: ConnectionRecord[] = [];
  private connectionCountResult = 0;
  private connectionUpdateResult: ConnectionRecord | null = null;
  private connectionDeleteResult: ConnectionRecord | null = null;
  private connectionDeleteManyResult = { count: 0 };
  private userFindUniqueResult: UserRecord | null = null;
  private userFindManyResult: UserRecord[] = [];

  calls: Array<{ method: string; args: unknown[] }> = [];

  connection = {
    create: async (args: unknown): Promise<ConnectionRecord> => {
      this.calls.push({ method: 'connection.create', args: [args] });
      if (!this.connectionCreateResult) throw new Error('No create result set');
      return this.connectionCreateResult;
    },
    findUnique: async (args: unknown): Promise<ConnectionRecord | null> => {
      this.calls.push({ method: 'connection.findUnique', args: [args] });
      return this.connectionFindUniqueResult;
    },
    findFirst: async (args: unknown): Promise<ConnectionRecord | null> => {
      this.calls.push({ method: 'connection.findFirst', args: [args] });
      return this.connectionFindFirstResult;
    },
    findMany: async (args: unknown): Promise<ConnectionRecord[]> => {
      this.calls.push({ method: 'connection.findMany', args: [args] });
      return this.connectionFindManyResult;
    },
    count: async (args: unknown): Promise<number> => {
      this.calls.push({ method: 'connection.count', args: [args] });
      return this.connectionCountResult;
    },
    update: async (args: unknown): Promise<ConnectionRecord> => {
      this.calls.push({ method: 'connection.update', args: [args] });
      if (!this.connectionUpdateResult) throw new Error('No update result set');
      return this.connectionUpdateResult;
    },
    delete: async (args: unknown): Promise<ConnectionRecord> => {
      this.calls.push({ method: 'connection.delete', args: [args] });
      if (!this.connectionDeleteResult) throw new Error('No delete result set');
      return this.connectionDeleteResult;
    },
    deleteMany: async (args: unknown): Promise<{ count: number }> => {
      this.calls.push({ method: 'connection.deleteMany', args: [args] });
      return this.connectionDeleteManyResult;
    },
  };

  user = {
    findUnique: async (args: unknown): Promise<UserRecord | null> => {
      this.calls.push({ method: 'user.findUnique', args: [args] });
      return this.userFindUniqueResult;
    },
    findMany: async (args: unknown): Promise<UserRecord[]> => {
      this.calls.push({ method: 'user.findMany', args: [args] });
      return this.userFindManyResult;
    },
  };

  setConnectionCreateResult(result: ConnectionRecord): void {
    this.connectionCreateResult = result;
  }

  setConnectionFindUniqueResult(result: ConnectionRecord | null): void {
    this.connectionFindUniqueResult = result;
  }

  setConnectionFindFirstResult(result: ConnectionRecord | null): void {
    this.connectionFindFirstResult = result;
  }

  setConnectionFindManyResult(result: ConnectionRecord[]): void {
    this.connectionFindManyResult = result;
  }

  setConnectionCountResult(count: number): void {
    this.connectionCountResult = count;
  }

  setConnectionUpdateResult(result: ConnectionRecord): void {
    this.connectionUpdateResult = result;
  }

  setConnectionDeleteResult(result: ConnectionRecord): void {
    this.connectionDeleteResult = result;
  }

  setConnectionDeleteManyResult(count: number): void {
    this.connectionDeleteManyResult = { count };
  }

  setUserFindUniqueResult(result: UserRecord | null): void {
    this.userFindUniqueResult = result;
  }

  setUserFindManyResult(result: UserRecord[]): void {
    this.userFindManyResult = result;
  }

  getCallsFor(method: string): Array<{ method: string; args: unknown[] }> {
    return this.calls.filter((c) => c.method === method);
  }
}

/**
 * Stub Logger
 */
const stubLogger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

/**
 * Stub Event Publisher
 */
const stubEventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
};

describe('ConnectionService', () => {
  let service: ConnectionService;
  let stubPrisma: StubPrismaService;

  beforeEach(() => {
    stubPrisma = new StubPrismaService();

    service = new ConnectionService(
      stubPrisma as never,
      stubLogger as never,
      stubEventPublisher as never,
    );
  });

  describe('sendConnectionRequest', () => {
    it('should create a connection request', async () => {
      const requesterId = 'user-1';
      const targetId = 'user-2';
      const now = new Date();

      stubPrisma.setUserFindUniqueResult({ id: targetId, name: 'User 2' });
      stubPrisma.setConnectionFindFirstResult(null);
      stubPrisma.setConnectionCreateResult({
        id: 'conn-1',
        requesterId,
        targetId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.sendConnectionRequest(requesterId, targetId);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
      expect(stubPrisma.getCallsFor('connection.create').length).toBeGreaterThan(0);
    });

    it('should throw BadRequestException when trying to connect with yourself', async () => {
      const userId = 'user-1';

      await expect(service.sendConnectionRequest(userId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      const requesterId = 'user-1';
      const targetId = 'nonexistent-user';

      stubPrisma.setUserFindUniqueResult(null);

      await expect(service.sendConnectionRequest(requesterId, targetId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when already connected', async () => {
      const requesterId = 'user-1';
      const targetId = 'user-2';
      const now = new Date();

      stubPrisma.setUserFindUniqueResult({ id: targetId, name: 'User 2' });
      stubPrisma.setConnectionFindFirstResult({
        id: 'existing-conn',
        requesterId,
        targetId,
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.sendConnectionRequest(requesterId, targetId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when request already pending', async () => {
      const requesterId = 'user-1';
      const targetId = 'user-2';
      const now = new Date();

      stubPrisma.setUserFindUniqueResult({ id: targetId, name: 'User 2' });
      stubPrisma.setConnectionFindFirstResult({
        id: 'existing-conn',
        requesterId,
        targetId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.sendConnectionRequest(requesterId, targetId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('acceptConnection', () => {
    it('should accept a pending connection request', async () => {
      const connectionId = 'conn-1';
      const currentUserId = 'user-2';
      const now = new Date();

      stubPrisma.setConnectionFindUniqueResult({
        id: connectionId,
        requesterId: 'user-1',
        targetId: currentUserId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });
      stubPrisma.setConnectionUpdateResult({
        id: connectionId,
        requesterId: 'user-1',
        targetId: currentUserId,
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: new Date(),
      });

      const result = await service.acceptConnection(connectionId, currentUserId);

      expect(result.status).toBe('ACCEPTED');
      expect(stubPrisma.getCallsFor('connection.update').length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when connection does not exist', async () => {
      stubPrisma.setConnectionFindUniqueResult(null);

      await expect(service.acceptConnection('nonexistent', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when connection is not pending', async () => {
      const now = new Date();
      stubPrisma.setConnectionFindUniqueResult({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.acceptConnection('conn-1', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when current user is not the target', async () => {
      const now = new Date();
      stubPrisma.setConnectionFindUniqueResult({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.acceptConnection('conn-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectConnection', () => {
    it('should reject a pending connection request', async () => {
      const connectionId = 'conn-1';
      const currentUserId = 'user-2';
      const now = new Date();

      stubPrisma.setConnectionFindUniqueResult({
        id: connectionId,
        requesterId: 'user-1',
        targetId: currentUserId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });
      stubPrisma.setConnectionUpdateResult({
        id: connectionId,
        requesterId: 'user-1',
        targetId: currentUserId,
        status: 'REJECTED',
        createdAt: now,
        updatedAt: new Date(),
      });

      const result = await service.rejectConnection(connectionId, currentUserId);

      expect(result.status).toBe('REJECTED');
    });

    it('should throw BadRequestException when current user is not the target', async () => {
      const now = new Date();
      stubPrisma.setConnectionFindUniqueResult({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.rejectConnection('conn-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeConnection', () => {
    it('should remove an accepted connection', async () => {
      const connectionId = 'conn-1';
      const currentUserId = 'user-1';
      const now = new Date();

      stubPrisma.setConnectionFindUniqueResult({
        id: connectionId,
        requesterId: currentUserId,
        targetId: 'user-2',
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });
      stubPrisma.setConnectionDeleteResult({
        id: connectionId,
        requesterId: currentUserId,
        targetId: 'user-2',
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });

      await service.removeConnection(connectionId, currentUserId);

      expect(stubPrisma.getCallsFor('connection.delete').length).toBeGreaterThan(0);
    });

    it('should allow the target side to remove', async () => {
      const connectionId = 'conn-1';
      const currentUserId = 'user-2';
      const now = new Date();

      stubPrisma.setConnectionFindUniqueResult({
        id: connectionId,
        requesterId: 'user-1',
        targetId: currentUserId,
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });
      stubPrisma.setConnectionDeleteResult({
        id: connectionId,
        requesterId: 'user-1',
        targetId: currentUserId,
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });

      await service.removeConnection(connectionId, currentUserId);

      expect(stubPrisma.getCallsFor('connection.delete').length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when connection does not exist', async () => {
      stubPrisma.setConnectionFindUniqueResult(null);

      await expect(service.removeConnection('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when connection is not accepted', async () => {
      const now = new Date();
      stubPrisma.setConnectionFindUniqueResult({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.removeConnection('conn-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user is not part of connection', async () => {
      const now = new Date();
      stubPrisma.setConnectionFindUniqueResult({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.removeConnection('conn-1', 'user-3')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getConnections', () => {
    it('should return paginated list of accepted connections', async () => {
      const userId = 'user-1';
      const now = new Date();
      const connections: ConnectionRecord[] = [
        {
          id: 'conn-1',
          requesterId: userId,
          targetId: 'user-2',
          status: 'ACCEPTED',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'conn-2',
          requesterId: 'user-3',
          targetId: userId,
          status: 'ACCEPTED',
          createdAt: now,
          updatedAt: now,
        },
      ];

      stubPrisma.setConnectionFindManyResult(connections);
      stubPrisma.setConnectionCountResult(2);

      const result = await service.getConnections(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getPendingRequests', () => {
    it('should return paginated list of pending requests', async () => {
      const userId = 'user-2';
      const now = new Date();
      const connections: ConnectionRecord[] = [
        {
          id: 'conn-1',
          requesterId: 'user-1',
          targetId: userId,
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        },
      ];

      stubPrisma.setConnectionFindManyResult(connections);
      stubPrisma.setConnectionCountResult(1);

      const result = await service.getPendingRequests(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const now = new Date();
      stubPrisma.setConnectionFindFirstResult({
        id: 'conn-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        status: 'ACCEPTED',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.isConnected('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      stubPrisma.setConnectionFindFirstResult(null);

      const result = await service.isConnected('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });

  describe('getConnectionStats', () => {
    it('should return connection count', async () => {
      stubPrisma.setConnectionCountResult(5);

      const result = await service.getConnectionStats('user-1');
      expect(result.connections).toBe(5);
    });
  });

  describe('getConnectionSuggestions', () => {
    it('should return users not connected to the current user', async () => {
      stubPrisma.setConnectionFindManyResult([]);
      stubPrisma.setUserFindManyResult([
        { id: 'user-4', name: 'User 4' },
        { id: 'user-5', name: 'User 5' },
      ]);

      const result = await service.getConnectionSuggestions('user-1');

      expect(result).toHaveLength(2);
    });
  });
});
