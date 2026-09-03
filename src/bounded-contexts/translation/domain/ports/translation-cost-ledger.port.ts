/**
 * Cost per user (ADR-003 §9). Every LLM call the worker makes is written
 * down with its token count and price; the monthly cap reads the sum.
 */

export interface TranslationCostEntry {
  readonly userId: string;
  readonly resumeId: string;
  readonly locale: string;
  readonly tokensUsed: number;
  readonly costUsdMicros: bigint;
}

export abstract class TranslationCostLedgerPort {
  abstract record(entry: TranslationCostEntry): Promise<void>;
  /** Sum of `costUsdMicros` for the user since the first day of the current month (UTC). */
  abstract monthToDateUsdMicros(userId: string, now: Date): Promise<bigint>;
}
