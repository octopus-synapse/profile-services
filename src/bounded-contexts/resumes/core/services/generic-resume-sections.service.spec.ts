import { beforeEach, describe, expect, it } from 'bun:test';
import {
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import {
  createTestGenericResumeSectionsService,
  InMemoryGenericResumeSectionsRepository,
} from '../testing';
import type { GenericResumeSectionsService } from './generic-resume-sections.service';

describe('GenericResumeSectionsService', () => {
  let service: GenericResumeSectionsService;
  let repository: InMemoryGenericResumeSectionsRepository;

  beforeEach(() => {
    repository = new InMemoryGenericResumeSectionsRepository();
    service = createTestGenericResumeSectionsService(repository);
  });

  describe('createItem', () => {
    it('enforces maxItems from section definition constraints', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'summary_v2',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'SUMMARY',
          constraints: {
            maxItems: 1,
          },
          fields: [{ key: 'text', type: 'string', required: true }],
        },
      });
      repository.seedResumeSection({
        id: 'resume-section-1',
        resumeId: 'resume-1',
        sectionTypeId: 'section-type-1',
      });
      repository.seedSectionItem({
        id: 'item-existing',
        resumeSectionId: 'resume-section-1',
        content: { text: 'Existing summary' },
      });

      await expect(
        service.createItem('resume-1', 'summary_v2', 'user-1', {
          text: 'Senior engineer with 10 years of experience',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('enforces single item when definition disallows multiple items', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'summary_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'SUMMARY',
          constraints: {
            allowsMultipleItems: false,
          },
          fields: [{ key: 'text', type: 'string', required: true }],
        },
      });
      repository.seedResumeSection({
        id: 'resume-section-1',
        resumeId: 'resume-1',
        sectionTypeId: 'section-type-1',
      });
      repository.seedSectionItem({
        id: 'item-existing',
        resumeSectionId: 'resume-section-1',
        content: { text: 'Existing summary' },
      });

      await expect(
        service.createItem('resume-1', 'summary_v1', 'user-1', {
          text: 'Another summary',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('creates resume section automatically when missing', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'work_experience_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'WORK_EXPERIENCE',
          fields: [{ key: 'company', type: 'string', required: true }],
        },
      });

      const created = await service.createItem('resume-1', 'work_experience_v1', 'user-1', {
        company: 'Octopus',
      });

      expect(created.id).toBeDefined();
      expect(created.content).toEqual({ company: 'Octopus' });
    });

    it('validates required fields in content', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'work_experience_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'WORK_EXPERIENCE',
          fields: [
            { key: 'company', type: 'string', required: true },
            { key: 'position', type: 'string', required: true },
          ],
        },
      });

      await expect(
        service.createItem('resume-1', 'work_experience_v1', 'user-1', {
          company: 'Octopus',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('accepts valid content with all required fields', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'work_experience_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'WORK_EXPERIENCE',
          fields: [
            { key: 'company', type: 'string', required: true },
            { key: 'position', type: 'string', required: true },
          ],
        },
      });

      const created = await service.createItem('resume-1', 'work_experience_v1', 'user-1', {
        company: 'Octopus',
        position: 'Senior Engineer',
      });

      expect(created.content).toEqual({
        company: 'Octopus',
        position: 'Senior Engineer',
      });
    });
  });

  describe('listResumeSections', () => {
    it('throws ForbiddenException when user does not own resume', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-2' });

      await expect(service.listResumeSections('resume-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns empty array when resume has no sections', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });

      const sections = await service.listResumeSections('resume-1', 'user-1');

      expect(sections).toEqual([]);
    });

    it('returns sections with items ordered correctly', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'work_experience_v1',
        title: 'Work Experience',
      });
      repository.seedResumeSection({
        id: 'resume-section-1',
        resumeId: 'resume-1',
        sectionTypeId: 'section-type-1',
        order: 0,
      });
      repository.seedSectionItem({
        id: 'item-1',
        resumeSectionId: 'resume-section-1',
        content: { company: 'Company A' },
        order: 0,
      });
      repository.seedSectionItem({
        id: 'item-2',
        resumeSectionId: 'resume-section-1',
        content: { company: 'Company B' },
        order: 1,
      });

      const sections = await service.listResumeSections('resume-1', 'user-1');

      expect(sections).toHaveLength(1);
      expect(sections[0].items).toHaveLength(2);
      expect(sections[0].items[0].id).toBe('item-1');
      expect(sections[0].items[1].id).toBe('item-2');
    });
  });

  describe('updateItem', () => {
    it('throws EntityNotFoundException when updating missing section item', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'summary_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'SUMMARY',
          fields: [{ key: 'text', type: 'string', required: true }],
        },
      });

      await expect(
        service.updateItem('resume-1', 'summary_v1', 'item-missing', 'user-1', {
          text: 'updated',
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('updates item content successfully', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'summary_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'SUMMARY',
          fields: [{ key: 'text', type: 'string', required: true }],
        },
      });
      repository.seedResumeSection({
        id: 'resume-section-1',
        resumeId: 'resume-1',
        sectionTypeId: 'section-type-1',
      });
      repository.seedSectionItem({
        id: 'item-1',
        resumeSectionId: 'resume-section-1',
        content: { text: 'Original text' },
      });

      const updated = await service.updateItem('resume-1', 'summary_v1', 'item-1', 'user-1', {
        text: 'Updated text',
      });

      expect(updated.content).toEqual({ text: 'Updated text' });
    });

    it('validates content schema on update', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'work_experience_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'WORK_EXPERIENCE',
          fields: [
            { key: 'company', type: 'string', required: true },
            { key: 'position', type: 'string', required: true },
          ],
        },
      });
      repository.seedResumeSection({
        id: 'resume-section-1',
        resumeId: 'resume-1',
        sectionTypeId: 'section-type-1',
      });
      repository.seedSectionItem({
        id: 'item-1',
        resumeSectionId: 'resume-section-1',
        content: { company: 'Old Company', position: 'Old Position' },
      });

      await expect(
        service.updateItem('resume-1', 'work_experience_v1', 'item-1', 'user-1', {
          company: 'New Company',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('deleteItem', () => {
    it('throws EntityNotFoundException when deleting missing section item', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'summary_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'SUMMARY',
          fields: [{ key: 'text', type: 'string', required: true }],
        },
      });

      await expect(
        service.deleteItem('resume-1', 'summary_v1', 'item-missing', 'user-1'),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('deletes item successfully', async () => {
      repository.seedResume({ id: 'resume-1', userId: 'user-1' });
      repository.seedSectionType({
        id: 'section-type-1',
        key: 'summary_v1',
        maxItems: null,
        definition: {
          schemaVersion: 1,
          kind: 'SUMMARY',
          fields: [{ key: 'text', type: 'string', required: true }],
        },
      });
      repository.seedResumeSection({
        id: 'resume-section-1',
        resumeId: 'resume-1',
        sectionTypeId: 'section-type-1',
      });
      repository.seedSectionItem({
        id: 'item-1',
        resumeSectionId: 'resume-section-1',
        content: { text: 'To be deleted' },
      });

      await service.deleteItem('resume-1', 'summary_v1', 'item-1', 'user-1');

      const sections = await service.listResumeSections('resume-1', 'user-1');
      expect(sections[0].items).toHaveLength(0);
    });
  });

  describe('listSectionTypes', () => {
    it('returns only active section types', async () => {
      repository.seedSectionType({
        id: 'st-1',
        key: 'active_v1',
        title: 'Active',
        isActive: true,
      });
      repository.seedSectionType({
        id: 'st-2',
        key: 'inactive_v1',
        title: 'Inactive',
        isActive: false,
      });

      const types = await service.listSectionTypes();

      expect(types).toHaveLength(1);
      expect(types[0].key).toBe('active_v1');
    });

    it('returns empty array when no active section types exist', async () => {
      const types = await service.listSectionTypes();

      expect(types).toEqual([]);
    });

    it('sorts section types by semantic kind, title, and version', async () => {
      repository.seedSectionType({
        id: 'st-1',
        key: 'work_v2',
        title: 'Work Experience',
        semanticKind: 'WORK_EXPERIENCE',
        version: 2,
      });
      repository.seedSectionType({
        id: 'st-2',
        key: 'work_v1',
        title: 'Work Experience',
        semanticKind: 'WORK_EXPERIENCE',
        version: 1,
      });
      repository.seedSectionType({
        id: 'st-3',
        key: 'education_v1',
        title: 'Education',
        semanticKind: 'EDUCATION',
        version: 1,
      });

      const types = await service.listSectionTypes();

      expect(types[0].semanticKind).toBe('EDUCATION');
      expect(types[1].key).toBe('work_v2');
      expect(types[2].key).toBe('work_v1');
    });
  });
});
