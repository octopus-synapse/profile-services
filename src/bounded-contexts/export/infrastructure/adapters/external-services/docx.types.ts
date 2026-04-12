/**
 * DOCX Export Types
 *
 * Only user data is typed explicitly here.
 * Resume section data uses the generic GenericResumeSectionData from docx-sections.service.
 */

export type DocxUserData = {
  name: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
};
