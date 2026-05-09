export interface SetUiStateKeyResult {
  readonly key: string;
  readonly value: unknown;
}

export abstract class SetUiStateKeyUseCasePort {
  abstract execute(userId: string, key: string, value: unknown): Promise<SetUiStateKeyResult>;
}
