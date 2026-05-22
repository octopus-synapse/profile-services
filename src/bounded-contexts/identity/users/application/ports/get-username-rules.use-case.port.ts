/**
 * Public username rules surface — the frontend fetches this at boot
 * and compiles the regex locally so input gating runs without a round
 * trip per keystroke. Backend remains the source of truth via
 * `username-rules.const.ts`.
 */

export interface UsernameRules {
  readonly pattern: string;
  readonly startsWithPattern: string;
  readonly endsWithPattern: string;
  readonly forbiddenSubstring: string;
  readonly minLength: number;
  readonly maxLength: number;
}

export abstract class GetUsernameRulesUseCasePort {
  abstract execute(): UsernameRules;
}
