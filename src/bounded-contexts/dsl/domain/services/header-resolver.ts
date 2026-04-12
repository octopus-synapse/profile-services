/**
 * Header Resolution Service
 *
 * Pure functions for resolving resume header data.
 *
 * In the new architecture, header data originates from the User entity,
 * with jobTitle overridable at the Resume and Variant levels.
 * The override chain is: variant > resume > user (most specific wins).
 */

export interface UserHeaderData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  jobTitle: string | null;
}

export interface ResumeHeaderOverrides {
  jobTitle?: string | null;
}

export interface VariantHeaderOverrides {
  jobTitle?: string | null;
}

export interface ResumeHeader {
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

/**
 * Resolve header data from the user, with optional resume and variant overrides.
 *
 * For jobTitle: uses the chain variant.jobTitle ?? resume.jobTitle ?? user.jobTitle
 * (first non-null wins, from most specific to least specific).
 *
 * For all other fields: always sourced from user data.
 */
export function resolveHeader(
  user: UserHeaderData,
  resume?: ResumeHeaderOverrides,
  variant?: VariantHeaderOverrides,
): ResumeHeader {
  return {
    fullName: user.fullName,
    jobTitle: variant?.jobTitle ?? resume?.jobTitle ?? user.jobTitle,
    phone: user.phone,
    email: user.email,
    location: user.location,
    linkedin: user.linkedin,
    github: user.github,
    website: user.website,
  };
}
