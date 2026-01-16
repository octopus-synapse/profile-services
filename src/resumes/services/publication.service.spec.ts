import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PublicationService } from './publication.service';
import { PublicationRepository } from '../repositories/publication.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreatePublicationDto, UpdatePublicationDto } from '../dto';

describe('PublicationService', () => {
  let service: PublicationService;
  let publicationRepository: PublicationRepository;
  let resumesRepository: ResumesRepository;

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Test Resume',
  };

  const mockPublication = {
    id: 'pub-123',
    resumeId: 'resume-123',
    title: 'Machine Learning in Production',
    publisher: 'IEEE',
    publicationType: 'Journal',
    publishedAt: new Date('2023-06-15'),
    url: 'https://doi.org/10.1234/ml-prod',
    abstract: 'Research on ML deployment',
    coAuthors: ['John Doe', 'Jane Smith'],
    citations: 42,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPublicationRepository = {
      findAllEntitiesForResume: mock(),
      findEntityByIdAndResumeId: mock(),
      createEntityForResume: mock(),
      updateEntityForResume: mock(),
      deleteEntityForResume: mock(),
      reorderEntitiesForResume: mock(),
    };

    const mockResumesRepository = {
      findResumeByIdAndUserId: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicationService,
        { provide: PublicationRepository, useValue: mockPublicationRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get(PublicationService);
    publicationRepository = module.get(PublicationRepository);
    resumesRepository = module.get(ResumesRepository);

    spyOn(Logger.prototype, 'log').mockImplementation();
    spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('listAllEntitiesForResume', () => {
    it('should return paginated publications', async () => {
      const paginatedResult = {
        data: [mockPublication],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      publicationRepository.findAllEntitiesForResume.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.listAllEntitiesForResume(
        'resume-123',
        'user-123',
      );

      expect(result).toEqual(paginatedResult);
      expect(
        publicationRepository.findAllEntitiesForResume,
      ).toHaveBeenCalledWith('resume-123', 1, 20);
    });
  });

  describe('getEntityByIdForResume', () => {
    it('should return single publication', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      publicationRepository.findEntityByIdAndResumeId.mockResolvedValue(
        mockPublication,
      );

      const result = await service.getEntityByIdForResume(
        'resume-123',
        'pub-123',
        'user-123',
      );

      expect(result.data).toEqual(mockPublication);
      expect(
        publicationRepository.findEntityByIdAndResumeId,
      ).toHaveBeenCalledWith('pub-123', 'resume-123');
    });

    it('should throw NotFoundException when not found', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      publicationRepository.findEntityByIdAndResumeId.mockResolvedValue(null);

      await expect(
        service.getEntityByIdForResume('resume-123', 'invalid-id', 'user-123'),
      ).rejects.toThrow('Publication not found');
    });
  });

  describe('addToResume', () => {
    it('should create new publication', async () => {
      const createDto: CreatePublicationDto = {
        title: 'Deep Learning Advances',
        coAuthors: ['Alice Johnson'],
        publisher: 'ACM',
        publicationType: 'Conference',
        publishedAt: '2023-12-01',
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      publicationRepository.createEntityForResume.mockResolvedValue(
        mockPublication,
      );

      const result = await service.addEntityToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockPublication);
      expect(publicationRepository.createEntityForResume).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateEntityByIdForResume', () => {
    it('should update existing publication', async () => {
      const updateDto: UpdatePublicationDto = {
        url: 'https://updated-url.com',
      };

      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      publicationRepository.updateEntityForResume.mockResolvedValue({
        ...mockPublication,
        url: updateDto.url!,
      } as any);

      const result = await service.updateEntityByIdForResume(
        'resume-123',
        'pub-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.url).toBe(updateDto.url);
      expect(publicationRepository.updateEntityForResume).toHaveBeenCalledWith(
        'pub-123',
        'resume-123',
        updateDto,
      );
    });
  });

  describe('deleteEntityByIdForResume', () => {
    it('should delete publication successfully', async () => {
      resumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume as any,
      );
      publicationRepository.deleteEntityForResume.mockResolvedValue(true);

      const result = await service.deleteEntityByIdForResume(
        'resume-123',
        'pub-123',
        'user-123',
      );

      expect(result.message).toBe('Publication deleted successfully');
      expect(publicationRepository.deleteEntityForResume).toHaveBeenCalledWith(
        'pub-123',
        'resume-123',
      );
    });
  });
});
