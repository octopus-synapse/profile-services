export interface OnboardingDataForValidation {
  username?: string | null;
  personalInfo?:
    | { fullName?: string; email?: string; phone?: string; location?: string }
    | Record<string, string | undefined>;
  professionalProfile?:
    | { jobTitle?: string; summary?: string }
    | Record<string, string | undefined>;
  templateSelection?:
    | { colorScheme?: string; templateId?: string }
    | Record<string, string | undefined>;
  [key: string]: unknown;
}
