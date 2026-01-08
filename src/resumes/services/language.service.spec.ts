/**
 * LanguageService Tests
 *
 * NOTA (Uncle Bob): LanguageService estende BaseSubResourceService.
 * Este spec testa configuração e instanciação do service.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LanguageService } from './language.service';
import { LanguageRepository } from '../repositories/language.repository';
import { ResumesRepository } from '../resumes.repository';

describe('LanguageService', () => {
  let service: LanguageService;

  const mockLanguageRepository = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        { provide: LanguageRepository, useValue: mockLanguageRepository },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    expect((service as any).entityName).toBe('Language');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations (inherited from BaseSubResourceService)', () => {
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockLanguage = {
      id: 'lang-1',
      resumeId: 'resume-1',
      name: 'English',
      level: 'NATIVE',
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockLanguageRepository.findAll.mockResolvedValue({
        data: [mockLanguage],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockLanguageRepository.findOne.mockResolvedValue(mockLanguage);
      mockLanguageRepository.create.mockResolvedValue(mockLanguage);
      mockLanguageRepository.update.mockResolvedValue(mockLanguage);
      mockLanguageRepository.delete.mockResolvedValue(true);
    });

    it('should list languages for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        name: 'English',
        level: 'NATIVE',
      });
    });

    it('should add language to resume', async () => {
      const createDto = { name: 'Spanish', level: 'FLUENT' };

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should delete language', async () => {
      const result = await service.deleteById('resume-1', 'lang-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
