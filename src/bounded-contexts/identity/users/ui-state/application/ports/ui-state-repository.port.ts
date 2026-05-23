export interface UiStateEntry {
  readonly key: string;
  readonly value: unknown;
}

export abstract class UiStateRepositoryPort {
  abstract list(userId: string): Promise<UiStateEntry[]>;
  abstract find(userId: string, key: string): Promise<UiStateEntry | null>;
  abstract upsert(userId: string, entry: UiStateEntry): Promise<UiStateEntry>;
  abstract delete(userId: string, key: string): Promise<void>;
}
