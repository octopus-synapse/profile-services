/**
 * Outbound port for the LLM-backed tailoring call. Keeps this BC
 * decoupled from the cross-context `ai` module — infrastructure adapts
 * the global `LlmPort` into this shape so application code stays inside
 * the bounded context boundary.
 */

export type TailorLlmBullet = {
  id: string;
  original: string;
  tailored: string;
  highlights: string[];
};

export type TailorLlmInput = {
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

export type TailorLlmOutput = {
  summary: string | null;
  jobTitle: string | null;
  bullets: TailorLlmBullet[];
};

export abstract class ResumeTailorLlmPort {
  abstract tailorResume(input: TailorLlmInput): Promise<TailorLlmOutput>;
}
