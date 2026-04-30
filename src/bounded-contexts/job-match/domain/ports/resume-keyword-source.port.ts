/**
 * Abstraction over "give me the keyword bag for this resume". The Match
 * orchestrator does not care whether the adapter parses bullets, reads
 * a dedicated Skills table, or mixes both — only that it returns an
 * array of keyword strings.
 */
export abstract class ResumeKeywordSourcePort {
  abstract getKeywords(resumeId: string): Promise<readonly string[]>;
}
