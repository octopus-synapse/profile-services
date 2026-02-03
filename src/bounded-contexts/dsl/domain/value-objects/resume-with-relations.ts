import {
  Resume,
  Experience,
  Education,
  Skill,
  Language,
  Project,
  Certification,
  Award,
  Recommendation,
  Interest,
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
