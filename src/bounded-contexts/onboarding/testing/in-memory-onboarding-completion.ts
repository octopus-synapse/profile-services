import type { OnboardingData } from '../domain/schemas/onboarding-data.schema';
import {
  OnboardingCompletionPort,
  type CompletionResult,
} from '../domain/ports/onboarding-completion.port';

interface CompletionRecord {
  userId: string;
  data: OnboardingData;
  resumeId: string;
}

export class InMemoryOnboardingCompletion extends OnboardingCompletionPort {
  private completions = new Map<string, CompletionRecord>();
  private idCounter = 0;

  async executeCompletion(userId: string, data: OnboardingData): Promise<CompletionResult> {
    this.idCounter++;
    const resumeId = `resume-${this.idCounter}`;
    this.completions.set(userId, { userId, data, resumeId });
    return { resumeId };
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  getCompletion(userId: string): CompletionRecord | undefined {
    return this.completions.get(userId);
  }

  getAllCompletions(): CompletionRecord[] {
    return Array.from(this.completions.values());
  }

  clear(): void {
    this.completions.clear();
    this.idCounter = 0;
  }
}
