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
      findAll: mock(),
      findOne: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      reorder: mock(),
    };

    const mockResumesRepository = {
      findOne: mock(),
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

  describe('listForResume', () => {
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

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      publicationRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.listForResume('resume-123', 'user-123');

      expect(result).toEqual(paginatedResult);
      expect(publicationRepository.findAll).toHaveBeenCalledWith(
        'resume-123',
        1,
        20,
      );
    });
  });

  describe('getById', () => {
    it('should return single publication', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      publicationRepository.findOne.mockResolvedValue(mockPublication);

      const result = await service.getById('resume-123', 'pub-123', 'user-123');

      expect(result.data).toEqual(mockPublication);
      expect(publicationRepository.findOne).toHaveBeenCalledWith(
        'pub-123',
        'resume-123',
      );
    });

    it('should throw NotFoundException when not found', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      publicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getById('resume-123', 'invalid-id', 'user-123'),
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

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      publicationRepository.create.mockResolvedValue(mockPublication);

      const result = await service.addToResume(
        'resume-123',
        'user-123',
        createDto,
      );

      expect(result.data).toEqual(mockPublication);
      expect(publicationRepository.create).toHaveBeenCalledWith(
        'resume-123',
        createDto,
      );
    });
  });

  describe('updateById', () => {
    it('should update existing publication', async () => {
      const updateDto: UpdatePublicationDto = {
        url: 'https://updated-url.com',
      };

      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      publicationRepository.update.mockResolvedValue({
        ...mockPublication,
        url: updateDto.url!,
      } as any);

      const result = await service.updateById(
        'resume-123',
        'pub-123',
        'user-123',
        updateDto,
      );

      expect(result.data!.url).toBe(updateDto.url);
      expect(publicationRepository.update).toHaveBeenCalledWith(
        'pub-123',
        'resume-123',
        updateDto,
      );
    });
  });

  describe('deleteById', () => {
    it('should delete publication successfully', async () => {
      resumesRepository.findOne.mockResolvedValue(mockResume as any);
      publicationRepository.delete.mockResolvedValue(true);

      const result = await service.deleteById(
        'resume-123',
        'pub-123',
        'user-123',
      );

      expect(result.message).toBe('Publication deleted successfully');
      expect(publicationRepository.delete).toHaveBeenCalledWith(
        'pub-123',
        'resume-123',
      );
    });
  });
});
