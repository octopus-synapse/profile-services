import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AdminSectionTypesService } from './admin-section-types.service';

describe('AdminSectionTypesService', () => {
  let service: AdminSectionTypesService;

  const mockSectionType = {
    id: 'cltest123',
    key: 'test_section_v1',
    slug: 'test-section',
    title: 'Test Section',
    description: 'A test section',
    semanticKind: 'TEST',
    version: 1,
    isActive: true,
    isSystem: false,
    isRepeatable: true,
    minItems: 0,
    maxItems: null,
    definition: { fields: [] },
    uiSchema: {},
    renderHints: {},
    fieldStyles: {},
    iconType: 'emoji',
    icon: '📄',
    translations: {
      en: { title: 'Test Section', label: 'test' },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    sectionType: {
      findMany: mock(() => Promise.resolve([]) as unknown),
      findUnique: mock(() => Promise.resolve(null) as unknown),
      findFirst: mock(() => Promise.resolve(null) as unknown),
      create: mock(() => Promise.resolve(mockSectionType) as unknown),
      update: mock(() => Promise.resolve(mockSectionType) as unknown),
      delete: mock(() => Promise.resolve(mockSectionType) as unknown),
      count: mock(() => Promise.resolve(0) as unknown),
    },
    resumeSection: {
      count: mock(() => Promise.resolve(0) as unknown),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSectionTypesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminSectionTypesService>(AdminSectionTypesService);
  });

  describe('findAll', () => {
    it('should return paginated section types', async () => {
      mockPrismaService.sectionType.findMany.mockImplementation(() =>
        Promise.resolve([mockSectionType]),
      );
      mockPrismaService.sectionType.count.mockImplementation(() => Promise.resolve(1));

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      mockPrismaService.sectionType.findMany.mockImplementation(() => Promise.resolve([]));
      mockPrismaService.sectionType.count.mockImplementation(() => Promise.resolve(0));

      const result = await service.findAll({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('findOne', () => {
    it('should return section type by key', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() =>
        Promise.resolve(mockSectionType),
      );

      const result = await service.findOne('test_section_v1');

      expect(result.key).toBe('test_section_v1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      key: 'new_section_v1',
      slug: 'new-section',
      title: 'New Section',
      semanticKind: 'NEW',
      version: 1,
      isRepeatable: true,
      minItems: 0,
      definition: { fields: [] },
      iconType: 'emoji' as const,
      icon: '✨',
      translations: {
        en: { title: 'New Section', label: 'new' },
        'pt-BR': { title: 'Nova Seção', label: 'nova' },
        es: { title: 'Nueva Sección', label: 'nueva' },
      },
      renderHints: {},
      fieldStyles: {},
    };

    it('should create a new section type', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() => Promise.resolve(null));
      mockPrismaService.sectionType.findFirst.mockImplementation(() => Promise.resolve(null));
      mockPrismaService.sectionType.create.mockImplementation(() =>
        Promise.resolve({
          ...mockSectionType,
          ...createDto,
          id: 'clnew123',
        }),
      );

      const result = await service.create(createDto);

      expect(result.key).toBe('new_section_v1');
    });

    it('should throw ConflictException if key exists', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() =>
        Promise.resolve(mockSectionType),
      );

      await expect(service.create({ ...createDto, key: 'test_section_v1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Title',
      icon: '🔄',
    };

    it('should update section type', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() =>
        Promise.resolve(mockSectionType),
      );
      mockPrismaService.sectionType.update.mockImplementation(() =>
        Promise.resolve({
          ...mockSectionType,
          ...updateDto,
        }),
      );

      const result = await service.update('test_section_v1', updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.icon).toBe('🔄');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete unused section type', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() =>
        Promise.resolve(mockSectionType),
      );
      mockPrismaService.resumeSection.count.mockImplementation(() => Promise.resolve(0));
      mockPrismaService.sectionType.delete.mockImplementation(() =>
        Promise.resolve(mockSectionType),
      );

      await service.remove('test_section_v1');

      expect(mockPrismaService.sectionType.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for system types', async () => {
      mockPrismaService.sectionType.findUnique.mockImplementation(() =>
        Promise.resolve({
          ...mockSectionType,
          isSystem: true,
        }),
      );

      await expect(service.remove('test_section_v1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSemanticKinds', () => {
    it('should return unique semantic kinds', async () => {
      mockPrismaService.sectionType.findMany.mockImplementation(() =>
        Promise.resolve([
          { semanticKind: 'WORK_EXPERIENCE' },
          { semanticKind: 'EDUCATION' },
          { semanticKind: 'SKILL_SET' },
        ]),
      );

      const result = await service.getSemanticKinds();

      expect(result).toEqual(['WORK_EXPERIENCE', 'EDUCATION', 'SKILL_SET']);
    });
  });
});
