/* eslint-disable @typescript-eslint/no-unused-vars */
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BaseSubResourceService } from './base-sub-resource.service';
import { ResumesRepository } from '../../resumes.repository';
import { ISubResourceRepository } from '../../interfaces/base-sub-resource.interface';
import { PaginatedResult } from '../../dto/pagination.dto';
import { MessageResponse } from '../../../common/dto/api-response.dto';

// Concrete implementation for testing
interface TestEntity {
  id: string;
  name: string;
  resumeId: string;
  order: number;
}

interface CreateTestDto {
  name: string;
}

interface UpdateTestDto {
  name?: string;
}

class TestSubResourceService extends BaseSubResourceService<
  TestEntity,
  CreateTestDto,
  UpdateTestDto
> {
  protected readonly entityName = 'TestEntity';
  protected readonly logger = new Logger('TestSubResourceService');
}

describe('BaseSubResourceService', () => {
  let service: TestSubResourceService;
  let mockRepository: jest.Mocked<
    ISubResourceRepository<TestEntity, CreateTestDto, UpdateTestDto>
  >;
  let mockResumesRepository: jest.Mocked<ResumesRepository>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-123';
  const mockEntityId = 'entity-123';

  const mockEntity: TestEntity = {
    id: mockEntityId,
    name: 'Test Entity',
    resumeId: mockResumeId,
    order: 1,
  };

  const mockResume = {
    id: mockResumeId,
    userId: mockUserId,
    title: 'Test Resume',
    slug: 'test-resume',
  };

  beforeEach(async () => {
    mockRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    };

    mockResumesRepository = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TestSubResourceService,
          useFactory: () =>
            new TestSubResourceService(mockRepository, mockResumesRepository),
        },
      ],
    }).compile();

    service = module.get<TestSubResourceService>(TestSubResourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateResumeOwnership', () => {
    it('should pass validation when user owns the resume', async () => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);

      // Access private method through public methods
      await expect(
        service.listForResume(mockResumeId, mockUserId),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when resume not found', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listForResume(mockResumeId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.listForResume(mockResumeId, mockUserId),
      ).rejects.toThrow('Resume not found or access denied');
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listForResume(mockResumeId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listForResume', () => {
    const mockPaginatedResult: PaginatedResult<TestEntity> = {
      data: [mockEntity],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);
    });

    it('should return paginated results for valid owner', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await service.listForResume(mockResumeId, mockUserId);

      expect(result).toEqual(mockPaginatedResult);
      expect(mockResumesRepository.findOne).toHaveBeenCalledWith(
        mockResumeId,
        mockUserId,
      );
      expect(mockRepository.findAll).toHaveBeenCalledWith(mockResumeId, 1, 20);
    });

    it('should pass custom pagination parameters', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      await service.listForResume(mockResumeId, mockUserId, 2, 10);

      expect(mockRepository.findAll).toHaveBeenCalledWith(mockResumeId, 2, 10);
    });

    it('should use default pagination when not provided', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      await service.listForResume(mockResumeId, mockUserId);

      expect(mockRepository.findAll).toHaveBeenCalledWith(mockResumeId, 1, 20);
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);
    });

    it('should return entity when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.getById(
        mockResumeId,
        mockEntityId,
        mockUserId,
      );

      expect(result).toEqual({
        success: true,
        data: mockEntity,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith(
        mockEntityId,
        mockResumeId,
      );
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById(mockResumeId, mockEntityId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getById(mockResumeId, mockEntityId, mockUserId),
      ).rejects.toThrow('TestEntity not found');
    });

    it('should validate resume ownership before finding entity', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById(mockResumeId, mockEntityId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    const createDto: CreateTestDto = { name: 'New Entity' };
    const createdEntity: TestEntity = { ...mockEntity, name: 'New Entity' };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);
    });

    it('should create entity for valid owner', async () => {
      mockRepository.create.mockResolvedValue(createdEntity);

      const result = await service.addToResume(
        mockResumeId,
        mockUserId,
        createDto,
      );

      expect(result).toEqual({
        success: true,
        data: createdEntity,
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        mockResumeId,
        createDto,
      );
    });

    it('should validate resume ownership before creating', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addToResume(mockResumeId, mockUserId, createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delegate creation to repository', async () => {
      mockRepository.create.mockResolvedValue(createdEntity);

      await service.addToResume(mockResumeId, mockUserId, createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        mockResumeId,
        createDto,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateTestDto = { name: 'Updated Entity' };
    const updatedEntity: TestEntity = { ...mockEntity, name: 'Updated Entity' };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);
    });

    it('should update entity for valid owner', async () => {
      mockRepository.update.mockResolvedValue(updatedEntity);

      const result = await service.updateById(
        mockResumeId,
        mockEntityId,
        mockUserId,
        updateDto,
      );

      expect(result).toEqual({
        success: true,
        data: updatedEntity,
      });
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockEntityId,
        mockResumeId,
        updateDto,
      );
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.updateById(mockResumeId, mockEntityId, mockUserId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate resume ownership before updating', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateById(mockResumeId, mockEntityId, mockUserId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);
    });

    it('should delete entity for valid owner', async () => {
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.deleteById(
        mockResumeId,
        mockEntityId,
        mockUserId,
      );

      expect(result).toEqual({
        message: 'TestEntity deleted successfully',
        success: true,
      });
      expect(mockRepository.delete).toHaveBeenCalledWith(
        mockEntityId,
        mockResumeId,
      );
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      await expect(
        service.deleteById(mockResumeId, mockEntityId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteById(mockResumeId, mockEntityId, mockUserId),
      ).rejects.toThrow('TestEntity not found');
    });

    it('should validate resume ownership before deleting', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteById(mockResumeId, mockEntityId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorder', () => {
    const ids = ['entity-1', 'entity-2', 'entity-3'];

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume as any);
    });

    it('should reorder entities for valid owner', async () => {
      mockRepository.reorder.mockResolvedValue(undefined);

      const result = await service.reorderInResume(
        mockResumeId,
        mockUserId,
        ids,
      );

      expect(result).toEqual({
        message: 'TestEntitys reordered successfully',
        success: true,
      });
      expect(mockRepository.reorder).toHaveBeenCalledWith(mockResumeId, ids);
    });

    it('should validate resume ownership before reordering', async () => {
      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reorderInResume(mockResumeId, mockUserId, ids),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delegate to repository correctly', async () => {
      mockRepository.reorder.mockResolvedValue(undefined);

      await service.reorderInResume(mockResumeId, mockUserId, ids);

      expect(mockRepository.reorder).toHaveBeenCalledWith(mockResumeId, ids);
    });
  });
});
