import { Logger } from '@nestjs/common';
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BaseSubResourceRepository,
  OrderByConfig,
} from './base-sub-resource.repository';

// Concrete implementation for testing
class TestEntity {
  id: string;
  resumeId: string;
  name: string;
  order: number;
  createdAt: Date;
}

class CreateTestDto {
  name: string;
  order?: number;
}

class UpdateTestDto {
  name?: string;
  order?: number;
}

class TestRepository extends BaseSubResourceRepository<
  TestEntity,
  CreateTestDto,
  UpdateTestDto
> {
  protected readonly logger = new Logger(TestRepository.name);
  private orderByConfig: OrderByConfig = { type: 'user-defined' };

  constructor(prisma: PrismaService, orderConfig?: OrderByConfig) {
    super(prisma);
    if (orderConfig) this.orderByConfig = orderConfig;
  }

  protected getPrismaDelegate() {
    return this.prisma.testEntity;
  }

  protected getOrderByConfig(): OrderByConfig {
    return this.orderByConfig;
  }

  protected mapCreate(resumeId: string, dto: CreateTestDto, order: number) {
    return {
      resumeId,
      name: dto.name,
      order: dto.order ?? order,
    };
  }

  protected mapUpdate(dto: UpdateTestDto) {
    return {
      ...(dto.name && { name: dto.name }),
      ...(dto.order !== undefined && { order: dto.order }),
    };
  }

  // Expose protected methods for testing
  public testGetMaxOrder(resumeId: string, dto?: CreateTestDto) {
    return this.getMaxOrder(resumeId, dto);
  }

  public testGetFindAllFilters() {
    return this.getFindAllFilters();
  }

  public testGetMaxOrderScope(dto?: CreateTestDto) {
    return this.getMaxOrderScope(dto);
  }
}

describe('BaseSubResourceRepository', () => {
  let repository: TestRepository;
  let prismaService: any;
  let mockPrismaDelegate: any;

  beforeEach(() => {
    mockPrismaDelegate = {
      findFirst: mock(),
      findUnique: mock(),
      findMany: mock(),
      count: mock(),
      create: mock(),
      update: mock(),
      updateMany: mock(),
      deleteMany: mock(),
      aggregate: mock(),
      $transaction: mock(),
    };

    prismaService = {
      testEntity: mockPrismaDelegate,
      $transaction: mock((operations) => {
        if (typeof operations === 'function') {
          return operations(mockPrismaDelegate);
        }
        return Promise.resolve();
      }),
    } as unknown as PrismaService;

    repository = new TestRepository(prismaService);
  });

  describe('findOne', () => {
    it('should find an entity by id and resumeId', async () => {
      const mockEntity: TestEntity = {
        id: '1',
        resumeId: 'resume-1',
        name: 'Test',
        order: 0,
        createdAt: new Date(),
      };

      mockPrismaDelegate.findFirst.mockResolvedValue(mockEntity);

      const result = await repository.findOne('1', 'resume-1');

      expect(result).toEqual(mockEntity);
      expect(mockPrismaDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: '1', resumeId: 'resume-1' },
      });
    });

    it('should return null if entity not found', async () => {
      mockPrismaDelegate.findFirst.mockResolvedValue(null);

      const result = await repository.findOne('1', 'resume-1');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results with user-defined ordering', async () => {
      const mockEntities: TestEntity[] = [
        {
          id: '1',
          resumeId: 'resume-1',
          name: 'Test 1',
          order: 0,
          createdAt: new Date(),
        },
        {
          id: '2',
          resumeId: 'resume-1',
          name: 'Test 2',
          order: 1,
          createdAt: new Date(),
        },
      ];

      mockPrismaDelegate.findMany.mockResolvedValue(mockEntities);
      mockPrismaDelegate.count.mockResolvedValue(2);

      const result = await repository.findAll('resume-1', 1, 20);

      expect(result.data).toEqual(mockEntities);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
      expect(mockPrismaDelegate.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-1' },
        orderBy: { order: 'asc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle date-desc ordering', async () => {
      const dateRepo = new TestRepository(prismaService, {
        type: 'date-desc',
        field: 'createdAt',
      });

      mockPrismaDelegate.findMany.mockResolvedValue([]);
      mockPrismaDelegate.count.mockResolvedValue(0);

      await dateRepo.findAll('resume-1', 1, 20);

      expect(mockPrismaDelegate.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle multiple field ordering', async () => {
      const multiRepo = new TestRepository(prismaService, {
        type: 'multiple',
        fields: [
          { field: 'name', direction: 'asc' },
          { field: 'order', direction: 'desc' },
        ],
      });

      mockPrismaDelegate.findMany.mockResolvedValue([]);
      mockPrismaDelegate.count.mockResolvedValue(0);

      await multiRepo.findAll('resume-1', 1, 20);

      expect(mockPrismaDelegate.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-1' },
        orderBy: [{ name: 'asc' }, { order: 'desc' }],
        skip: 0,
        take: 20,
      });
    });

    it('should calculate pagination metadata correctly', async () => {
      mockPrismaDelegate.findMany.mockResolvedValue([]);
      mockPrismaDelegate.count.mockResolvedValue(45);

      const result = await repository.findAll('resume-1', 2, 20);

      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });
  });

  describe('create', () => {
    it('should create an entity with auto-incremented order', async () => {
      const dto: CreateTestDto = { name: 'New Test' };
      const mockCreated: TestEntity = {
        id: '1',
        resumeId: 'resume-1',
        name: 'New Test',
        order: 1,
        createdAt: new Date(),
      };

      mockPrismaDelegate.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaDelegate.create.mockResolvedValue(mockCreated);

      const result = await repository.create('resume-1', dto);

      expect(result).toEqual(mockCreated);
      expect(mockPrismaDelegate.aggregate).toHaveBeenCalledWith({
        where: { resumeId: 'resume-1' },
        _max: { order: true },
      });
      expect(mockPrismaDelegate.create).toHaveBeenCalledWith({
        data: {
          resumeId: 'resume-1',
          name: 'New Test',
          order: 1,
        },
      });
    });

    it('should use provided order if specified', async () => {
      const dto: CreateTestDto = { name: 'New Test', order: 5 };

      mockPrismaDelegate.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaDelegate.create.mockResolvedValue({} as TestEntity);

      await repository.create('resume-1', dto);

      expect(mockPrismaDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 5 }),
      });
    });

    it('should handle empty collection (order starts at 0)', async () => {
      mockPrismaDelegate.aggregate.mockResolvedValue({
        _max: { order: null },
      });
      mockPrismaDelegate.create.mockResolvedValue({} as TestEntity);

      await repository.create('resume-1', { name: 'First' });

      expect(mockPrismaDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 0 }),
      });
    });
  });

  describe('update', () => {
    it('should update an entity using updateMany', async () => {
      const dto: UpdateTestDto = { name: 'Updated' };
      const mockUpdated: TestEntity = {
        id: '1',
        resumeId: 'resume-1',
        name: 'Updated',
        order: 0,
        createdAt: new Date(),
      };

      mockPrismaDelegate.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaDelegate.findUnique.mockResolvedValue(mockUpdated);

      const result = await repository.update('1', 'resume-1', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaDelegate.updateMany).toHaveBeenCalledWith({
        where: { id: '1', resumeId: 'resume-1' },
        data: { name: 'Updated' },
      });
    });

    it('should return null if entity not found', async () => {
      mockPrismaDelegate.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.update('1', 'resume-1', { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an entity using deleteMany', async () => {
      mockPrismaDelegate.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.delete('1', 'resume-1');

      expect(result).toBe(true);
      expect(mockPrismaDelegate.deleteMany).toHaveBeenCalledWith({
        where: { id: '1', resumeId: 'resume-1' },
      });
    });

    it('should return false if entity not found', async () => {
      mockPrismaDelegate.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.delete('1', 'resume-1');

      expect(result).toBe(false);
    });
  });

  describe('reorder', () => {
    it('should reorder entities in a transaction', async () => {
      const ids = ['1', '2', '3'];

      mockPrismaDelegate.update.mockResolvedValue({});
      prismaService.$transaction.mockImplementation(async (fn) => {
        // Execute the transaction function
        if (typeof fn === 'function') {
          return await fn();
        }
        // Fallback for array of operations
        return Promise.all(fn);
      });

      await repository.reorder('resume-1', ids);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaDelegate.update).toHaveBeenCalledTimes(3);
      expect(mockPrismaDelegate.update).toHaveBeenNthCalledWith(1, {
        where: { id: '1' },
        data: { order: 0 },
      });
      expect(mockPrismaDelegate.update).toHaveBeenNthCalledWith(2, {
        where: { id: '2' },
        data: { order: 1 },
      });
      expect(mockPrismaDelegate.update).toHaveBeenNthCalledWith(3, {
        where: { id: '3' },
        data: { order: 2 },
      });
    });
  });

  describe('getMaxOrder', () => {
    it('should get max order for resumeId', async () => {
      mockPrismaDelegate.aggregate.mockResolvedValue({
        _max: { order: 5 },
      });

      const result = await repository.testGetMaxOrder('resume-1');

      expect(result).toBe(5);
      expect(mockPrismaDelegate.aggregate).toHaveBeenCalledWith({
        where: { resumeId: 'resume-1' },
        _max: { order: true },
      });
    });

    it('should return -1 if no entities exist', async () => {
      mockPrismaDelegate.aggregate.mockResolvedValue({
        _max: { order: null },
      });

      const result = await repository.testGetMaxOrder('resume-1');

      expect(result).toBe(-1);
    });
  });

  describe('protected template methods', () => {
    it('should return empty filters by default', () => {
      const filters = repository.testGetFindAllFilters();
      expect(filters).toEqual({});
    });

    it('should return empty scope by default', () => {
      const scope = repository.testGetMaxOrderScope();
      expect(scope).toEqual({});
    });
  });
});
