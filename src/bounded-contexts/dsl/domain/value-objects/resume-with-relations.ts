import {
  Award,
  Certification,
  Education,
  Experience,
  Interest,
  Language,
  Project,
  Recommendation,
  Resume,
  Skill,
} from '@prisma/client';

export type ResumeWithRelations = Resume & {
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  recommendations: Recommendation[];
  interests: Interest[];
  activeTheme?: { id: string; name: string; styleConfig: unknown } | null;
};
