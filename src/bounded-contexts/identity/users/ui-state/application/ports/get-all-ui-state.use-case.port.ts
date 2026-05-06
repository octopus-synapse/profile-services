export abstract class GetAllUiStateUseCasePort {
  abstract execute(userId: string): Promise<Record<string, unknown>>;
}
