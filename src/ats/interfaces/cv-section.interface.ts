export enum CVSectionType {
  PERSONAL_INFO = 'personal_info',
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  CERTIFICATIONS = 'certifications',
  PROJECTS = 'projects',
  AWARDS = 'awards',
  PUBLICATIONS = 'publications',
  LANGUAGES = 'languages',
  INTERESTS = 'interests',
  REFERENCES = 'references',
}

export interface CVSection {
  type: CVSectionType;
  title: string;
  content: string;
  startLine?: number;
  endLine?: number;
  order?: number;
}

export interface ParsedCV {
  sections: CVSection[];
  rawText: string;
  metadata: {
    fileName: string;
    fileType: string;
    extractedAt: Date;
  };
}
