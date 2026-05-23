export interface OnboardingDataForValidation {
  username?: string | null;
  personalInfo?:
    | { fullName?: string; email?: string; phone?: string; location?: string }
    | Record<string, string | undefined>;
  professionalProfile?:
    | { jobTitle?: string; summary?: string }
    | Record<string, string | undefined>;
  /** FK to `ResumeStyle.id` chosen on the resume-style step. */
  resumeStyleId?: string | null;
  [key: string]: unknown;
}
