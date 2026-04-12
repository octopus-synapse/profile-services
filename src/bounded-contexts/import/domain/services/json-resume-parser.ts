/**
 * JSON Resume Parser
 *
 * Pure domain service that parses JSON Resume format (jsonresume.org)
 * to internal ParsedResumeData. No external dependencies.
 */

import type { JsonResumeSchema, ParsedResumeData } from '../types/import.types';

export class JsonResumeParser {
  parse(jsonResume: JsonResumeSchema): ParsedResumeData {
    const basics = jsonResume.basics ?? {};
    const work = jsonResume.work ?? [];
    const education = jsonResume.education ?? [];
    const skills = jsonResume.skills ?? [];

    const linkedinProfile = basics.profiles?.find((p) => p.network?.toLowerCase() === 'linkedin');

    const sections: ParsedResumeData['sections'] = [];

    if (work.length > 0) {
      sections.push({
        sectionTypeKey: 'work_experience_v1',
        items: work.map((w) => ({
          position: w.position ?? '',
          company: w.name ?? '',
          startDate: w.startDate ?? '',
          endDate: w.endDate,
          description: w.summary,
          highlights: w.highlights,
        })),
      });
    }

    if (education.length > 0) {
      sections.push({
        sectionTypeKey: 'education_v1',
        items: education.map((e) => ({
          degree: e.studyType ?? '',
          institution: e.institution ?? '',
          startDate: e.startDate,
          endDate: e.endDate,
        })),
      });
    }

    const flattenedSkills: string[] = [];
    for (const skillGroup of skills) {
      if (skillGroup.name) {
        flattenedSkills.push(skillGroup.name);
      }
      if (skillGroup.keywords) {
        flattenedSkills.push(...skillGroup.keywords);
      }
    }
    if (flattenedSkills.length > 0) {
      sections.push({
        sectionTypeKey: 'skill_v1',
        items: flattenedSkills.map((name) => ({ name })),
      });
    }

    if (jsonResume.certificates && jsonResume.certificates.length > 0) {
      sections.push({
        sectionTypeKey: 'certification_v1',
        items: jsonResume.certificates.map((c) => ({
          name: c.name ?? '',
          issuer: c.issuer,
          issueDate: c.date,
          url: c.url,
        })),
      });
    }

    if (jsonResume.languages && jsonResume.languages.length > 0) {
      sections.push({
        sectionTypeKey: 'language_v1',
        items: jsonResume.languages.map((l) => ({
          name: l.language ?? '',
          level: l.fluency,
        })),
      });
    }

    if (jsonResume.projects && jsonResume.projects.length > 0) {
      sections.push({
        sectionTypeKey: 'project_v1',
        items: jsonResume.projects.map((p) => ({
          name: p.name ?? '',
          description: p.description,
          url: p.url,
          technologies: p.keywords,
        })),
      });
    }

    return {
      personalInfo: {
        name: basics.name ?? '',
        email: basics.email,
        phone: basics.phone,
        location: basics.location
          ? `${basics.location.city ?? ''}${basics.location.region ? `, ${basics.location.region}` : ''}`
          : undefined,
        linkedin: linkedinProfile?.url,
        website: basics.url,
      },
      summary: basics.summary,
      sections,
    };
  }

  validate(data: ParsedResumeData): string[] {
    const errors: string[] = [];
    if (!data.personalInfo.name) {
      errors.push('Name is required');
    }
    return errors;
  }

  isJsonResumeSchema(value: unknown): value is JsonResumeSchema {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
}
