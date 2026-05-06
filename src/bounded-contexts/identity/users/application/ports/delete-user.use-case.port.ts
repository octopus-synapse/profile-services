export abstract class DeleteUserUseCasePort {
  abstract execute(userId: string, requesterId: string): Promise<void>;
}
