import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminSectionTypesService } from './admin-section-types.service';
import { InMemorySectionTypesRepository } from './testing';

describe('AdminSectionTypesService', () => {
  let service: AdminSectionTypesService;
  let repository: InMemorySectionTypesRepository;

  beforeEach(async () => {
    repository = new InMemorySectionTypesRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSectionTypesService,
        {
          provide: PrismaService,
          useValue: {
            sectionType: repository,
            resumeSection: {
              count: (params: { where: { sectionTypeId: string } }) =>
                repository.countResumeSections(params),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminSectionTypesService>(AdminSectionTypesService);
  });

  describe('findAll', () => {
    it('should return paginated section types', async () => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'test-section',
        title: 'Test Section',
        semanticKind: 'TEST',
        version: 1,
      });

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      const result = await service.findAll({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by search term', async () => {
      repository.seedSectionType({
        key: 'work_experience_v1',
        slug: 'work-experience',
        title: 'Work Experience',
        semanticKind: 'WORK_EXPERIENCE',
        version: 1,
      });
      repository.seedSectionType({
        key: 'education_v1',
        slug: 'education',
        title: 'Education',
        semanticKind: 'EDUCATION',
        version: 1,
      });

      const result = await service.findAll({ search: 'work', page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].key).toBe('work_experience_v1');
    });

    it('should filter by isActive', async () => {
      repository.seedSectionType({
        key: 'active_v1',
        title: 'Active',
        isActive: true,
      });
      repository.seedSectionType({
        key: 'inactive_v1',
        title: 'Inactive',
        isActive: false,
      });

      const result = await service.findAll({ isActive: true, page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].key).toBe('active_v1');
    });

    it('should filter by semanticKind', async () => {
      repository.seedSectionType({
        key: 'work_v1',
        title: 'Work',
        semanticKind: 'WORK_EXPERIENCE',
      });
      repository.seedSectionType({
        key: 'edu_v1',
        title: 'Education',
        semanticKind: 'EDUCATION',
      });

      const result = await service.findAll({
        semanticKind: 'WORK_EXPERIENCE',
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].key).toBe('work_v1');
    });
  });

  describe('findOne', () => {
    it('should return section type by key', async () => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'test-section',
        title: 'Test Section',
        semanticKind: 'TEST',
        version: 1,
      });

      const result = await service.findOne('test_section_v1');

      expect(result.key).toBe('test_section_v1');
    });

    it('should throw EntityNotFoundException when not found', async () => {
      await expect(service.findOne('nonexistent')).rejects.toThrow(EntityNotFoundException);
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
      const result = await service.create(createDto);

      expect(result.key).toBe('new_section_v1');
      expect(result.title).toBe('New Section');
      expect(result.isSystem).toBe(false);
      expect(result.isActive).toBe(true);
    });

    it('should throw ConflictException if key exists', async () => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'test-section',
        title: 'Test Section',
      });

      await expect(service.create({ ...createDto, key: 'test_section_v1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if slug + version exists', async () => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'new-section',
        version: 1,
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Title',
      icon: '🔄',
    };

    beforeEach(() => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'test-section',
        title: 'Test Section',
        semanticKind: 'TEST',
        version: 1,
      });
    });

    it('should update section type', async () => {
      const result = await service.update('test_section_v1', updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.icon).toBe('🔄');
    });

    it('should throw EntityNotFoundException when not found', async () => {
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw ValidationException when updating restricted fields on system types', async () => {
      repository.seedSectionType({
        key: 'system_section_v1',
        slug: 'system',
        title: 'System Section',
        isSystem: true,
      });

      await expect(
        service.update('system_section_v1', {
          definition: { fields: [{ key: 'newField', type: 'string' }] },
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should allow updating non-restricted fields on system types', async () => {
      repository.seedSectionType({
        key: 'system_section_v1',
        slug: 'system',
        title: 'System Section',
        isSystem: true,
      });

      const result = await service.update('system_section_v1', { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });

    it('should merge translations correctly', async () => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'test',
        title: 'Test',
        translations: {
          en: { title: 'Test', label: 'test' },
          'pt-BR': { title: 'Teste', label: 'teste' },
        },
      });

      const result = await service.update('test_section_v1', {
        translations: {
          en: { title: 'Updated Test', label: 'updated-test' },
          es: { title: 'Prueba', label: 'prueba' },
        },
      });

      const translations = result.translations as Record<string, { title: string; label?: string }>;
      expect(translations.en.title).toBe('Updated Test');
      expect(translations['pt-BR'].title).toBe('Teste');
      expect(translations.es.title).toBe('Prueba');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      repository.seedSectionType({
        key: 'test_section_v1',
        slug: 'test-section',
        title: 'Test Section',
      });
    });

    it('should delete unused section type', async () => {
      await service.remove('test_section_v1');

      expect(repository.getSectionType('test_section_v1')).toBeUndefined();
    });

    it('should throw EntityNotFoundException when not found', async () => {
      await expect(service.remove('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ValidationException for system types', async () => {
      repository.seedSectionType({
        key: 'system_section_v1',
        slug: 'system',
        title: 'System',
        isSystem: true,
      });

      await expect(service.remove('system_section_v1')).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if section type is in use', async () => {
      const sectionType = repository.getSectionType('test_section_v1');
      if (!sectionType) throw new Error('Section type not found in test setup');
      repository.seedResumeSection({
        resumeId: 'resume-1',
        sectionTypeId: sectionType.id,
      });

      await expect(service.remove('test_section_v1')).rejects.toThrow(ValidationException);
    });
  });

  describe('getSemanticKinds', () => {
    it('should return unique semantic kinds', async () => {
      repository.seedSectionType({
        key: 'work_v1',
        semanticKind: 'WORK_EXPERIENCE',
      });
      repository.seedSectionType({
        key: 'work_v2',
        semanticKind: 'WORK_EXPERIENCE',
      });
      repository.seedSectionType({
        key: 'edu_v1',
        semanticKind: 'EDUCATION',
      });
      repository.seedSectionType({
        key: 'skill_v1',
        semanticKind: 'SKILL_SET',
      });

      const result = await service.getSemanticKinds();

      expect(result).toEqual(['EDUCATION', 'SKILL_SET', 'WORK_EXPERIENCE']);
    });

    it('should return empty array when no section types exist', async () => {
      const result = await service.getSemanticKinds();

      expect(result).toEqual([]);
    });
  });
});
