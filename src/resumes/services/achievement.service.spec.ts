import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ResumesRepository } from '../resumes.repository';

describe('AchievementService', () => {
  let service: AchievementService;

  const mockAchievementRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    reorder: jest.fn(),
  };

  const mockResumesRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        {
          provide: AchievementRepository,
          useValue: mockAchievementRepository,
        },
        {
          provide: ResumesRepository,
          useValue: mockResumesRepository,
        },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated achievements for valid resume', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';
      const mockResume = { id: resumeId, userId };
      const mockAchievements = {
        items: [
          {
            id: 'achievement-1',
            resumeId,
            title: 'Achievement 1',
            description: 'Description 1',
            order: 0,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.findAll.mockResolvedValue(mockAchievements);

      const result = await service.listForResume(resumeId, userId);

      expect(result).toEqual(mockAchievements);
      expect(mockResumesRepository.findOne).toHaveBeenCalledWith(
        resumeId,
        userId,
      );
      expect(mockAchievementRepository.findAll).toHaveBeenCalledWith(
        resumeId,
        1,
        20,
      );
    });

    it('should throw ForbiddenException if resume not found', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';

      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(service.listForResume(resumeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAchievementRepository.findAll).not.toHaveBeenCalled();
    });

    it('should accept custom page and limit', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';
      const mockResume = { id: resumeId, userId };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      });

      await service.listForResume(resumeId, userId, 2, 10);

      expect(mockAchievementRepository.findAll).toHaveBeenCalledWith(
        resumeId,
        2,
        10,
      );
    });
  });

  describe('findOne', () => {
    it('should return achievement for valid resume and id', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'achievement-123';
      const userId = 'user-123';
      const mockResume = { id: resumeId, userId };
      const mockAchievement = {
        id: achievementId,
        resumeId,
        title: 'Test Achievement',
        description: 'Test Description',
        order: 0,
      };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.findOne.mockResolvedValue(mockAchievement);

      const result = await service.getById(resumeId, achievementId, userId);

      expect(result).toEqual(mockAchievement);
      expect(mockAchievementRepository.findOne).toHaveBeenCalledWith(
        achievementId,
        resumeId,
      );
    });

    it('should throw NotFoundException if achievement not found', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'nonexistent-achievement';
      const userId = 'user-123';
      const mockResume = { id: resumeId, userId };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById(resumeId, achievementId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if resume not owned by user', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'achievement-123';
      const userId = 'user-123';

      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById(resumeId, achievementId, userId),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAchievementRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create achievement for valid resume', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';
      const createDto = {
        type: 'custom',
        title: 'New Achievement',
        description: 'New Description',
        achievedAt: '2024-01-15',
      };
      const mockResume = { id: resumeId, userId };
      const mockCreatedAchievement = {
        id: 'achievement-new',
        resumeId,
        ...createDto,
        order: 0,
      };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.create.mockResolvedValue(
        mockCreatedAchievement,
      );

      const result = await service.addToResume(resumeId, userId, createDto);

      expect(result).toEqual(mockCreatedAchievement);
      expect(mockAchievementRepository.create).toHaveBeenCalledWith(
        resumeId,
        createDto,
      );
    });

    it('should throw ForbiddenException if resume not owned by user', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';
      const createDto = {
        type: 'custom',
        title: 'New Achievement',
        description: 'New Description',
        achievedAt: '2024-01-15',
      };

      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addToResume(resumeId, userId, createDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAchievementRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update achievement for valid resume and id', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'achievement-123';
      const userId = 'user-123';
      const updateDto = {
        title: 'Updated Achievement',
      };
      const mockResume = { id: resumeId, userId };
      const mockUpdatedAchievement = {
        id: achievementId,
        resumeId,
        title: 'Updated Achievement',
        description: 'Original Description',
        order: 0,
      };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.update.mockResolvedValue(
        mockUpdatedAchievement,
      );

      const result = await service.updateById(
        resumeId,
        achievementId,
        userId,
        updateDto,
      );

      expect(result).toEqual(mockUpdatedAchievement);
      expect(mockAchievementRepository.update).toHaveBeenCalledWith(
        achievementId,
        resumeId,
        updateDto,
      );
    });

    it('should throw NotFoundException if achievement not found', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'nonexistent-achievement';
      const userId = 'user-123';
      const updateDto = { title: 'Updated' };
      const mockResume = { id: resumeId, userId };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.update.mockResolvedValue(null);

      await expect(
        service.updateById(resumeId, achievementId, userId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete achievement for valid resume and id', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'achievement-123';
      const userId = 'user-123';
      const mockResume = { id: resumeId, userId };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.delete.mockResolvedValue(true);

      const result = await service.deleteById(resumeId, achievementId, userId);

      expect(result).toEqual({
        success: true,
        message: 'Achievement deleted successfully',
      });
      expect(mockAchievementRepository.delete).toHaveBeenCalledWith(
        achievementId,
        resumeId,
      );
    });

    it('should throw NotFoundException if achievement not found', async () => {
      const resumeId = 'resume-123';
      const achievementId = 'nonexistent-achievement';
      const userId = 'user-123';
      const mockResume = { id: resumeId, userId };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.delete.mockResolvedValue(false);

      await expect(
        service.deleteById(resumeId, achievementId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('should reorder achievements for valid resume', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';
      const ids = ['achievement-1', 'achievement-2', 'achievement-3'];
      const mockResume = { id: resumeId, userId };

      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockAchievementRepository.reorder.mockResolvedValue(undefined);

      const result = await service.reorderInResume(resumeId, userId, ids);

      expect(result).toEqual({
        success: true,
        message: 'Achievements reordered successfully',
      });
      expect(mockAchievementRepository.reorder).toHaveBeenCalledWith(
        resumeId,
        ids,
      );
    });

    it('should throw ForbiddenException if resume not owned by user', async () => {
      const resumeId = 'resume-123';
      const userId = 'user-123';
      const ids = ['achievement-1', 'achievement-2'];

      mockResumesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reorderInResume(resumeId, userId, ids),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAchievementRepository.reorder).not.toHaveBeenCalled();
    });
  });
});
