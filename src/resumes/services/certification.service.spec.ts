/**
 * CertificationService Tests
 *
 * NOTA (Uncle Bob): CertificationService estende BaseSubResourceService.
 * A classe base já tem testes completos para comportamento CRUD genérico.
 * Este spec testa apenas que o service está corretamente configurado
 * e pode ser instanciado (teste de caracterização/integração leve).
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CertificationService } from './certification.service';
import { CertificationRepository } from '../repositories/certification.repository';
import { ResumesRepository } from '../resumes.repository';

describe('CertificationService', () => {
  let service: CertificationService;

  const mockCertificationRepository = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificationService,
        {
          provide: CertificationRepository,
          useValue: mockCertificationRepository,
        },
        { provide: ResumesRepository, useValue: mockResumesRepository },
      ],
    }).compile();

    service = module.get<CertificationService>(CertificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct entity name', () => {
    // Access protected property through type assertion for testing
    expect((service as any).entityName).toBe('Certification');
  });

  it('should have a logger instance', () => {
    expect((service as any).logger).toBeInstanceOf(Logger);
  });

  describe('CRUD operations (inherited from BaseSubResourceService)', () => {
    const mockResume = createMockResume({ id: 'resume-1', userId: 'user-1' });
    const mockCertification = {
      id: 'cert-1',
      resumeId: 'resume-1',
      name: 'AWS Solutions Architect',
      issuer: 'Amazon',
      dateObtained: new Date('2023-01-15'),
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findResumeByIdAndUserId.mockResolvedValue(
        mockResume,
      );
      mockCertificationRepository.findAllEntitiesForResume.mockResolvedValue({
        data: [mockCertification],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockCertificationRepository.findEntityByIdAndResumeId.mockResolvedValue(
        mockCertification,
      );
      mockCertificationRepository.createEntityForResume.mockResolvedValue(
        mockCertification,
      );
      mockCertificationRepository.updateEntityForResume.mockResolvedValue(
        mockCertification,
      );
      mockCertificationRepository.deleteEntityForResume.mockResolvedValue(true);
    });

    it('should list certifications for resume', async () => {
      const result = await service.listAllEntitiesForResume(
        'resume-1',
        'user-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
      });
    });

    it('should get certification by id', async () => {
      const result = await service.getEntityByIdForResume(
        'resume-1',
        'cert-1',
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        name: 'AWS Solutions Architect',
      });
    });

    it('should add certification to resume', async () => {
      const createDto = {
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
        issueDate: '2023-01-15',
      };

      const result = await service.addEntityToResume(
        'resume-1',
        'user-1',
        createDto,
      );

      expect(result.success).toBe(true);
    });

    it('should update certification', async () => {
      const result = await service.updateEntityByIdForResume(
        'resume-1',
        'cert-1',
        'user-1',
        {
          name: 'Updated Certification',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should delete certification', async () => {
      const result = await service.deleteEntityByIdForResume(
        'resume-1',
        'cert-1',
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.message.includes('deleted')).toBe(true);
    });
  });
});
