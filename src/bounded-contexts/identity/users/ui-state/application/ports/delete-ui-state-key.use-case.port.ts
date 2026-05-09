export abstract class DeleteUiStateKeyUseCasePort {
  abstract execute(userId: string, key: string): Promise<void>;
}
