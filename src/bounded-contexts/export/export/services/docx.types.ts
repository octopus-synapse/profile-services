export type DocxExperience = {
  position: string;
  company: string;
  startDate: Date | null;
  endDate: Date | null;
  location: string | null;
  description: string | null;
};

export type DocxEducation = {
  degree: string;
  field: string;
  institution: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type DocxProject = {
  name: string;
  description: string | null;
  url: string | null;
};

export type DocxSkill = {
  name: string;
};

export type DocxLanguage = {
  name: string;
  level: string | null;
};

export type DocxResumeData = {
  experiences: DocxExperience[];
  education: DocxEducation[];
  skills: DocxSkill[];
  projects: DocxProject[];
  languages: DocxLanguage[];
};

export type DocxUserData = {
  name: string | null;
  displayName: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
};
