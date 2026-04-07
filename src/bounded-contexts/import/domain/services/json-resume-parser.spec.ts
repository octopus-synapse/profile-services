import { describe, expect, it } from 'bun:test';
import { sampleJsonResume, minimalJsonResume } from '../../testing/fixtures/import-job.fixtures';
import { JsonResumeParser } from './json-resume-parser';

describe('JsonResumeParser', () => {
  const parser = new JsonResumeParser();

  describe('parse', () => {
    it('should parse full JSON Resume format', () => {
      const parsed = parser.parse(sampleJsonResume);

      expect(parsed.personalInfo.name).toBe('John Doe');
      expect(parsed.personalInfo.email).toBe('john@example.com');
      expect(parsed.personalInfo.linkedin).toBe('https://linkedin.com/in/johndoe');
      expect(parsed.personalInfo.location).toBe('San Francisco, CA');
      expect(parsed.summary).toBe('Software engineer with 5 years experience');

      const workSection = parsed.sections.find((s) => s.sectionTypeKey === 'work_experience_v1');
      expect(workSection?.items).toHaveLength(1);
      expect(workSection?.items[0].company).toBe('TechCorp');
      expect(workSection?.items[0].position).toBe('Senior Engineer');

      const eduSection = parsed.sections.find((s) => s.sectionTypeKey === 'education_v1');
      expect(eduSection?.items).toHaveLength(1);
      expect(eduSection?.items[0].institution).toBe('MIT');

      const skillSection = parsed.sections.find((s) => s.sectionTypeKey === 'skill_v1');
      expect(skillSection?.items.map((i) => i.name)).toContain('JavaScript');
      expect(skillSection?.items.map((i) => i.name)).toContain('React');
      expect(skillSection?.items.map((i) => i.name)).toContain('Python');
    });

    it('should handle missing optional fields', () => {
      const parsed = parser.parse(minimalJsonResume);

      expect(parsed.personalInfo.name).toBe('Jane Doe');
      expect(parsed.sections).toHaveLength(0);
    });

    it('should flatten skills from nested structure', () => {
      const parsed = parser.parse({
        skills: [
          { name: 'Frontend', keywords: ['React', 'Vue', 'Angular'] },
          { name: 'Backend', keywords: ['Node.js', 'Python'] },
        ],
      });

      const skillSection = parsed.sections.find((s) => s.sectionTypeKey === 'skill_v1');
      const skillNames = skillSection?.items.map((i) => i.name) ?? [];
      expect(skillNames).toContain('Frontend');
      expect(skillNames).toContain('React');
      expect(skillNames).toContain('Vue');
      expect(skillNames).toContain('Node.js');
    });

    it('should parse certifications', () => {
      const parsed = parser.parse({
        certificates: [{ name: 'AWS Solutions Architect', issuer: 'Amazon' }],
      });

      const certSection = parsed.sections.find((s) => s.sectionTypeKey === 'certification_v1');
      expect(certSection?.items).toHaveLength(1);
      expect(certSection?.items[0].name).toBe('AWS Solutions Architect');
    });

    it('should parse languages', () => {
      const parsed = parser.parse({
        languages: [{ language: 'English', fluency: 'Native' }],
      });

      const langSection = parsed.sections.find((s) => s.sectionTypeKey === 'language_v1');
      expect(langSection?.items).toHaveLength(1);
      expect(langSection?.items[0].name).toBe('English');
    });

    it('should parse projects', () => {
      const parsed = parser.parse({
        projects: [{ name: 'OSS Project', description: 'Cool project', keywords: ['TypeScript'] }],
      });

      const projSection = parsed.sections.find((s) => s.sectionTypeKey === 'project_v1');
      expect(projSection?.items).toHaveLength(1);
      expect(projSection?.items[0].name).toBe('OSS Project');
    });

    it('should handle completely empty input', () => {
      const parsed = parser.parse({});
      expect(parsed.personalInfo.name).toBe('');
      expect(parsed.sections).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should pass for valid data', () => {
      const parsed = parser.parse(sampleJsonResume);
      expect(parser.validate(parsed)).toHaveLength(0);
    });

    it('should fail when name is missing', () => {
      const errors = parser.validate({
        personalInfo: {},
        sections: [],
      });
      expect(errors).toContain('Name is required');
    });
  });

  describe('isJsonResumeSchema', () => {
    it('should return true for objects', () => {
      expect(parser.isJsonResumeSchema({ basics: {} })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(parser.isJsonResumeSchema(null)).toBe(false);
      expect(parser.isJsonResumeSchema(undefined)).toBe(false);
      expect(parser.isJsonResumeSchema([])).toBe(false);
      expect(parser.isJsonResumeSchema('string')).toBe(false);
    });
  });
});
