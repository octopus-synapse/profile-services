/**
 * LLM Port — provider-agnostic surface the rest of the app depends on.
 *
 * Keeps OpenAI behind an abstraction so we can swap to Anthropic / a
 * self-hosted model later without touching the use-cases. Each method
 * corresponds to a named prompt in `domain/prompts/`.
 */

export const LLM_PORT = Symbol('LLM_PORT');

export type TailorResumeBullet = {
  /** Stable id so the UI can diff. For section items we pass the item id;
   * for single-field rewrites (summary, jobTitle) we pass the field name. */
  id: string;
  original: string;
  tailored: string;
  /** Substrings inside `tailored` the UI should highlight as keyword matches. */
  highlights: string[];
};

export type TailorResumeInput = {
  /** The master resume in the shape the prompt expects (free-form; the service
   * trims it to fit the model's context). */
  resume: {
    summary?: string | null;
    jobTitle?: string | null;
    primaryStack?: string[];
    sections: Array<{
      key: string;
      semanticKind: string | null;
      items: Array<{ id: string; content: Record<string, unknown> }>;
    }>;
  };
  job: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    skills: string[];
  };
};

export type TailorResumeOutput = {
  /** Rewritten summary (null to leave as-is). */
  summary: string | null;
  /** Optional new job title to mirror the target role. */
  jobTitle: string | null;
  /** One entry per bullet the LLM chose to change; omit unchanged items. */
  bullets: TailorResumeBullet[];
};

/** Structured resume the PDF extractor returns. Kept intentionally small —
 * enough to bootstrap the onboarding review step; the user refines later. */
export type ExtractedResume = {
  fullName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  summary: string | null;
  skills: string[];
  experiences: Array<{
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }>;
  education: Array<{
    institution: string;
    degree: string | null;
    startDate: string | null;
    endDate: string | null;
  }>;
};

export abstract class LlmPort {
  /** Rewrite a resume's summary and selected bullets for a specific job. */
  abstract tailorResume(input: TailorResumeInput): Promise<TailorResumeOutput>;
  /** Turn raw CV text (e.g. extracted from PDF) into a structured resume. */
  abstract extractResumeFromText(text: string): Promise<ExtractedResume>;
}
