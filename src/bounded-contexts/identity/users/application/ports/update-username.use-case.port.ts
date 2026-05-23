export interface UpdatedUsername {
  readonly username: string;
}

export abstract class UpdateUsernameUseCasePort {
  abstract execute(userId: string, newUsername: string): Promise<UpdatedUsername>;
}
