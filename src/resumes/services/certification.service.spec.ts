/**
 * CertificationService Tests
 *
 * NOTA (Uncle Bob): CertificationService estende BaseSubResourceService.
 * A classe base já tem testes completos para comportamento CRUD genérico.
 * Este spec testa apenas que o service está corretamente configurado
 * e pode ser instanciado (teste de caracterização/integração leve).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CertificationService } from './certification.service';
import { CertificationRepository } from '../repositories/certification.repository';
import { ResumesRepository } from '../resumes.repository';

describe('CertificationService', () => {
  let service: CertificationService;

  const mockCertificationRepository = {
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
    const mockResume = { id: 'resume-1', userId: 'user-1' };
    const mockCertification = {
      id: 'cert-1',
      resumeId: 'resume-1',
      name: 'AWS Solutions Architect',
      issuer: 'Amazon',
      dateObtained: new Date('2023-01-15'),
      order: 0,
    };

    beforeEach(() => {
      mockResumesRepository.findOne.mockResolvedValue(mockResume);
      mockCertificationRepository.findAll.mockResolvedValue({
        data: [mockCertification],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockCertificationRepository.findOne.mockResolvedValue(mockCertification);
      mockCertificationRepository.create.mockResolvedValue(mockCertification);
      mockCertificationRepository.update.mockResolvedValue(mockCertification);
      mockCertificationRepository.delete.mockResolvedValue(true);
    });

    it('should list certifications for resume', async () => {
      const result = await service.listForResume('resume-1', 'user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
      });
    });

    it('should get certification by id', async () => {
      const result = await service.getById('resume-1', 'cert-1', 'user-1');

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

      const result = await service.addToResume('resume-1', 'user-1', createDto);

      expect(result.success).toBe(true);
    });

    it('should update certification', async () => {
      const result = await service.updateById('resume-1', 'cert-1', 'user-1', {
        name: 'Updated Certification',
      });

      expect(result.success).toBe(true);
    });

    it('should delete certification', async () => {
      const result = await service.deleteById('resume-1', 'cert-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted');
    });
  });
});
