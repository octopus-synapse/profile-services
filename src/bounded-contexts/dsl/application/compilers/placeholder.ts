import type { SectionData } from './shared';

const EMPTY_SECTIONS: Record<string, SectionData> = {
  experience: { type: 'experience', items: [] },
  education: { type: 'education', items: [] },
  skills: { type: 'skills', items: [] },
  languages: { type: 'languages', items: [] },
  projects: { type: 'projects', items: [] },
  certifications: { type: 'certifications', items: [] },
  awards: { type: 'awards', items: [] },
  interests: { type: 'interests', items: [] },
  references: { type: 'references', items: [] },
  summary: { type: 'summary', data: { content: '' } },
  objective: { type: 'objective', data: { content: '' } },
  volunteer: { type: 'volunteer', items: [] },
  publications: { type: 'publications', items: [] },
};

export function getPlaceholderData(sectionId: string): SectionData {
  return EMPTY_SECTIONS[sectionId] ?? { type: 'custom', items: [] };
}
